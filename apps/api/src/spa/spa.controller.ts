import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join, normalize, resolve, sep } from 'node:path'

import { Controller, Get, Inject, NotFoundException, Req, Res } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import {
  CATALOG_INDEX_PATH,
  catalogMakePath,
  catalogPath,
  shareAliasOfPath,
  shareAliasPath,
  type CatalogMake,
  type CatalogModel
} from '@carplates/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'

import {
  breadcrumbJsonLd,
  catalogCarJsonLd,
  catalogCrumbs,
  catalogIndexSeoBlock,
  catalogMakePageText,
  catalogMakeSeoBlock,
  catalogModelCrumbs,
  catalogPageText,
  catalogSeoBlock,
  injectRoot
} from '../catalog/catalog-text.js'
import { CatalogService } from '../catalog/catalog.service.js'
import { loadEnv } from '../env.js'
import { injectMeta, renderMetaTags } from './meta.js'
import {
  catalogMakeCardSlug,
  catalogMakeOfPath,
  catalogPageSlug,
  catalogSlugsOfPath,
  isCatalogIndexPath,
  pageCardSlug,
  shareAliasCardSlug
} from './page-card.js'
import { PreviewService } from './preview.service.js'
import { sitemapPaths } from './sitemap.js'
import { DEFAULT_LANG, SHARE_ALIAS_PAGES, STATIC_PAGES, resolveLang, sectionPageText, type Lang } from './spa-text.js'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8'
}

const mimeOf = (path: string): string => {
  const dot = path.lastIndexOf('.')
  return (dot >= 0 && MIME[path.slice(dot)]) || 'application/octet-stream'
}

/** A malformed %-escape is a miss (falls through to the SPA), not a 500. */
const safeDecode = (s: string): string => {
  try {
    return decodeURIComponent(s)
  } catch {
    return ''
  }
}

/** Catalog pages change with the monthly ingest, so the edge may keep them a day and serve stale for a week while it refreshes. */
const CATALOG_PAGE_CACHE = 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'

// Must revalidate every load, or a stale service worker / manifest pins users to an old build.
const NO_CACHE_FILES = new Set(['sw.js', 'registerSW.js', 'manifest.webmanifest'])

const cacheControlOf = (rel: string): string => {
  if (rel.startsWith('assets/')) return 'public, max-age=31536000, immutable'
  if (NO_CACHE_FILES.has(rel)) return 'no-cache'
  return 'public, max-age=86400'
}

/**
 * Serves the built web app and injects per-plate / per-VIN meta tags into
 * index.html on deep links. Inactive unless WEB_DIST_DIR is set — in dev the
 * Vite server on :5173 owns the frontend.
 */
@ApiExcludeController()
@Controller()
export class SpaController {
  private readonly env = loadEnv()
  private readonly distDir = this.env.WEB_DIST_DIR ? resolve(this.env.WEB_DIST_DIR) : null
  private indexHtmlCache: string | null = null
  private indexStamp = ''
  // Bounded: one entry per known route × language, plus one shared '*' entry per language.
  private readonly staticMetaCache = new Map<string, string>()

  constructor(
    @Inject(PreviewService) private readonly previews: PreviewService,
    @Inject(CatalogService) private readonly catalog: CatalogService
  ) {}

  @Get()
  root(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    return this.render('/', req, reply)
  }

  @Get('*')
  async serve(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const pathname = (req.url.split('?')[0] ?? '/') || '/'
    const rel = safeDecode(pathname.replace(/^\/+/, ''))

    // real file under the dist dir → serve it
    if (this.distDir && rel && !rel.includes('..')) {
      const filePath = normalize(join(this.distDir, rel))
      if (filePath.startsWith(this.distDir + sep)) {
        try {
          if ((await stat(filePath)).isFile()) {
            reply.type(mimeOf(filePath)).header('cache-control', cacheControlOf(rel)).send(createReadStream(filePath))
            return
          }
        } catch {
          /* fall through to SPA */
        }
      }
    }

    await this.render(pathname, req, reply)
  }

  private async render(pathname: string, req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!this.distDir) {
      throw new NotFoundException(
        'Web app is not built. Run the Vite dev server (pnpm --filter @carplates/web dev) or set WEB_DIST_DIR.'
      )
    }
    const html = await this.loadIndex()
    const lang = resolveLang((req.query as { lang?: string } | undefined)?.lang)
    const section = (req.query as { section?: string } | undefined)?.section
    const catalog = await this.catalogPageOf(pathname, lang)
    const meta = catalog?.meta ?? (await this.metaFor(pathname, lang, section))
    reply
      .type('text/html; charset=utf-8')
      .header('cache-control', catalog ? CATALOG_PAGE_CACHE : 'no-cache')
      .send(catalog ? injectRoot(injectMeta(html, meta), catalog.block) : injectMeta(html, meta))
  }

  /** Re-read when the file changes: a web deploy repoints `WEB_DIST_DIR` (a symlink) without restarting the API. */
  private async loadIndex(): Promise<string> {
    const file = join(this.distDir as string, 'index.html')
    const { mtimeMs, size } = await stat(file)
    const stamp = `${mtimeMs}:${size}`
    if (this.indexHtmlCache && this.indexStamp === stamp) return this.indexHtmlCache
    this.indexHtmlCache = await readFile(file, 'utf8')
    this.indexStamp = stamp
    return this.indexHtmlCache
  }

  /**
   * Meta tags + the `#root` block of a catalog page (`/cars`, `/cars/:make`, `/cars/:make/:model`), or null for any other
   * path or a make/model with no page (those fall through to the normal unknown-path handling).
   */
  private async catalogPageOf(pathname: string, lang: Lang): Promise<{ meta: string; block: string } | null> {
    if (isCatalogIndexPath(pathname)) return this.catalogIndexPage(lang)
    const slugs = catalogSlugsOfPath(pathname)
    if (slugs) {
      const model = await this.catalog.get(slugs.make, slugs.model)
      return model ? { meta: this.catalogMeta(model, lang), block: catalogSeoBlock(model, lang) } : null
    }
    const makeSlug = catalogMakeOfPath(pathname)
    const make = makeSlug ? await this.catalog.make(makeSlug) : null
    return make ? { meta: this.catalogMakeMeta(make, lang), block: catalogMakeSeoBlock(make, lang) } : null
  }

  /** `/cars` is a static page (title, sitemap entry), plus the make list in the block. */
  private async catalogIndexPage(lang: Lang): Promise<{ meta: string; block: string }> {
    const siteUrl = this.env.PUBLIC_SITE_URL
    const langQuery = lang === DEFAULT_LANG ? '' : `?lang=${lang}`
    return {
      meta: renderMetaTags({
        siteUrl,
        path: CATALOG_INDEX_PATH,
        lang,
        ...(STATIC_PAGES[CATALOG_INDEX_PATH] as NonNullable<(typeof STATIC_PAGES)[string]>)[lang],
        image: `${siteUrl}/og/page/${pageCardSlug(CATALOG_INDEX_PATH)}.png${langQuery}`,
        alternates: true,
        jsonLd: breadcrumbJsonLd(siteUrl, catalogCrumbs(lang), lang)
      }),
      block: catalogIndexSeoBlock(await this.catalog.makes(), lang)
    }
  }

  private catalogMakeMeta(make: CatalogMake, lang: Lang): string {
    const siteUrl = this.env.PUBLIC_SITE_URL
    const langQuery = lang === DEFAULT_LANG ? '' : `?lang=${lang}`
    return renderMetaTags({
      siteUrl,
      path: catalogMakePath(make.make),
      lang,
      ...catalogMakePageText(make, lang),
      image: `${siteUrl}/og/page/${catalogMakeCardSlug(make.make)}.png${langQuery}`,
      noindex: !make.indexable,
      alternates: make.indexable,
      jsonLd: breadcrumbJsonLd(siteUrl, catalogCrumbs(lang, { slug: make.make, name: make.makeName }), lang)
    })
  }

  /** Thin pages (below the threshold or outside the MVP set) stay reachable but `noindex`. */
  private catalogMeta(model: CatalogModel, lang: Lang): string {
    const siteUrl = this.env.PUBLIC_SITE_URL
    const langQuery = lang === DEFAULT_LANG ? '' : `?lang=${lang}`
    return renderMetaTags({
      siteUrl,
      path: catalogPath(model.make, model.model),
      lang,
      ...catalogPageText(model, lang),
      image: `${siteUrl}/og/page/${catalogPageSlug(model.make, model.model)}.png${langQuery}`,
      noindex: !model.indexable,
      alternates: model.indexable,
      jsonLd: [breadcrumbJsonLd(siteUrl, catalogModelCrumbs(model, lang), lang), catalogCarJsonLd(siteUrl, model, lang)]
    })
  }

  /**
   * Plate/VIN deep links get per-vehicle tags (first load only — in-app navigation never hits the
   * server); every other path gets its static page tags, rendered once per path+language and cached.
   */
  private async metaFor(pathname: string, lang: Lang, section?: string): Promise<string> {
    const segments = pathname.split('/').filter(Boolean)
    const siteUrl = this.env.PUBLIC_SITE_URL
    const langQuery = lang === DEFAULT_LANG ? '' : `?lang=${lang}`

    // Share/campaign link: its own preview here (scrapers do not run JS), then the SPA sends the visitor to the home page.
    // og:url stays the alias itself - pointing it at `/` would make Facebook re-scrape the home page's tags instead.
    const alias = shareAliasOfPath(pathname)
    if (alias) {
      const cacheKey = `go:${alias}:${lang}`
      let block = this.staticMetaCache.get(cacheKey)
      if (!block) {
        block = renderMetaTags({
          siteUrl,
          path: shareAliasPath(alias),
          lang,
          ...SHARE_ALIAS_PAGES[alias][lang],
          image: `${siteUrl}/og/page/${shareAliasCardSlug(alias)}.png${langQuery}`,
          noindex: true
        })
        this.staticMetaCache.set(cacheKey, block)
      }
      return block
    }

    if (segments.length === 1 && !(`/${segments[0]}` in STATIC_PAGES)) {
      const query = decodeURIComponent(segments[0] as string)
      const preview = await this.previews.describe(query, lang)
      if (preview) {
        const base = section === 'value' ? await this.previews.describeValue(preview, lang) : preview
        const text = section === 'value' ? base : sectionPageText(lang, base, section)
        return renderMetaTags({
          siteUrl,
          path: `/${encodeURIComponent(preview.value)}`,
          lang,
          title: text.title,
          description: text.description,
          image: `${siteUrl}/og/${encodeURIComponent(preview.value)}.png${langQuery}`,
          noindex: true
        })
      }
    }

    const path = `/${segments.join('/')}`
    const known = path in STATIC_PAGES
    const cacheKey = `${known ? path : '*'}:${lang}`
    let block = this.staticMetaCache.get(cacheKey)
    if (!block) {
      const page = (STATIC_PAGES[known ? path : '/'] as NonNullable<(typeof STATIC_PAGES)[string]>)[lang]
      block = renderMetaTags({
        siteUrl,
        path: known && path !== '/' ? path : '',
        lang,
        ...page,
        image: `${siteUrl}/og/${known && pageCardSlug(path) ? `page/${pageCardSlug(path)}` : 'default'}.png${langQuery}`,
        // Unknown paths (typos, not-found plates) shouldn't be indexed under the home page's tags.
        noindex: !known,
        alternates: known && sitemapPaths().includes(path)
      })
      this.staticMetaCache.set(cacheKey, block)
    }
    return block
  }
}
