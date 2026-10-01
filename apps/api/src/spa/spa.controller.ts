import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join, normalize, resolve } from 'node:path'

import { Controller, Get, Inject, NotFoundException, Req, Res } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { loadEnv } from '../env.js'
import { injectMeta, renderMetaTags } from './meta.js'
import { PreviewService } from './preview.service.js'
import { DEFAULT_LANG, STATIC_PAGES, resolveLang, type Lang } from './spa-text.js'

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
  // Bounded: one entry per known route × language, plus one shared '*' entry per language.
  private readonly staticMetaCache = new Map<string, string>()

  constructor(@Inject(PreviewService) private readonly previews: PreviewService) {}

  @Get()
  root(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    return this.render('/', req, reply)
  }

  @Get('*')
  async serve(@Req() req: FastifyRequest, @Res() reply: FastifyReply): Promise<void> {
    const pathname = (req.url.split('?')[0] ?? '/') || '/'
    const rel = decodeURIComponent(pathname.replace(/^\/+/, ''))

    // real file under the dist dir → serve it
    if (this.distDir && rel && !rel.includes('..')) {
      const filePath = normalize(join(this.distDir, rel))
      if (filePath.startsWith(this.distDir)) {
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
    const meta = await this.metaFor(pathname, lang)
    reply.type('text/html; charset=utf-8').header('cache-control', 'no-cache').send(injectMeta(html, meta))
  }

  private async loadIndex(): Promise<string> {
    if (this.indexHtmlCache) return this.indexHtmlCache
    this.indexHtmlCache = await readFile(join(this.distDir as string, 'index.html'), 'utf8')
    return this.indexHtmlCache
  }

  /**
   * Plate/VIN deep links get per-vehicle tags (first load only — in-app navigation never hits the
   * server); every other path gets its static page tags, rendered once per path+language and cached.
   */
  private async metaFor(pathname: string, lang: Lang): Promise<string> {
    const segments = pathname.split('/').filter(Boolean)
    const siteUrl = this.env.PUBLIC_SITE_URL
    const langQuery = lang === DEFAULT_LANG ? '' : `?lang=${lang}`

    if (segments.length === 1 && !(`/${segments[0]}` in STATIC_PAGES)) {
      const query = decodeURIComponent(segments[0] as string)
      const preview = await this.previews.describe(query, lang)
      if (preview) {
        return renderMetaTags({
          siteUrl,
          path: `/${encodeURIComponent(preview.value)}`,
          lang,
          title: preview.title,
          description: preview.description,
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
        image: `${siteUrl}/og/default.png${langQuery}`,
        // Unknown paths (typos, not-found plates) shouldn't be indexed under the home page's tags.
        noindex: !known
      })
      this.staticMetaCache.set(cacheKey, block)
    }
    return block
  }
}
