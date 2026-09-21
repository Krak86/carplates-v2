import { createReadStream } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import { join, normalize, resolve } from 'node:path'

import { Controller, Get, Inject, Logger, NotFoundException, Req, Res } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { classifyQuery } from '@carplates/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'

import { loadEnv } from '../env.js'
import { PlateService } from '../plate/plate.service.js'
import { VinService } from '../vin/vin.service.js'
import { injectMeta, plateMetaText, renderMetaTags, vinMetaText } from './meta.js'

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

/**
 * Serves the built web app and injects per-plate / per-VIN meta tags into
 * index.html on deep links. Inactive unless WEB_DIST_DIR is set — in dev the
 * Vite server on :5173 owns the frontend.
 */
@ApiExcludeController()
@Controller()
export class SpaController {
  private readonly logger = new Logger('Spa')
  private readonly env = loadEnv()
  private readonly distDir = this.env.WEB_DIST_DIR ? resolve(this.env.WEB_DIST_DIR) : null
  private indexHtmlCache: string | null = null

  constructor(
    @Inject(PlateService) private readonly plateService: PlateService,
    @Inject(VinService) private readonly vinService: VinService
  ) {}

  @Get()
  root(@Res() reply: FastifyReply): Promise<void> {
    return this.render('/', reply)
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
            reply.type(mimeOf(filePath)).send(createReadStream(filePath))
            return
          }
        } catch {
          /* fall through to SPA */
        }
      }
    }

    await this.render(pathname, reply)
  }

  private async render(pathname: string, reply: FastifyReply): Promise<void> {
    if (!this.distDir) {
      throw new NotFoundException(
        'Web app is not built. Run the Vite dev server (pnpm --filter @carplates/web dev) or set WEB_DIST_DIR.'
      )
    }
    const html = await this.loadIndex()
    const meta = await this.metaFor(pathname)
    reply.type('text/html; charset=utf-8').send(meta ? injectMeta(html, meta) : html)
  }

  private async loadIndex(): Promise<string> {
    if (this.indexHtmlCache) return this.indexHtmlCache
    this.indexHtmlCache = await readFile(join(this.distDir as string, 'index.html'), 'utf8')
    return this.indexHtmlCache
  }

  private async metaFor(pathname: string): Promise<string | undefined> {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length !== 1) return undefined
    const query = decodeURIComponent(segments[0] as string)
    const siteUrl = this.env.PUBLIC_SITE_URL

    try {
      if (classifyQuery(query) === 'vin') {
        const res = await this.vinService.decode(query)
        return renderMetaTags({ siteUrl, path: `/${query}`, ...vinMetaText(res) })
      }
      const res = await this.plateService.lookup(query)
      return renderMetaTags({
        siteUrl,
        path: `/${res.plate}`,
        image: `${siteUrl}/og/${encodeURIComponent(res.plate)}.png`,
        ...plateMetaText(res)
      })
    } catch (err) {
      this.logger.debug(`no meta for "${query}": ${(err as Error).message}`)
      return undefined
    }
  }
}
