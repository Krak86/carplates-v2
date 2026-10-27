import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { Controller, Get, Inject, Param, Query, Res, UseGuards } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { FastifyReply } from 'fastify'

import { loadEnv } from '../env.js'
import { Lru } from './lru.js'
import { buildCardSvg, readLogo, renderPng } from './og-card.js'
import { PreviewService } from './preview.service.js'
import { TAGLINE, resolveLang, type Lang } from './spa-text.js'

// Where the web app's static assets (fonts, brand logos) live: the built dist in production,
// the Vite public dir in dev (WEB_DIST_DIR unset).
const DEV_PUBLIC_DIR = resolve(import.meta.dirname, '../../../web/public')

const PNG_CACHE_MAX = 300
const CACHE_OK = 'public, max-age=86400'
const CACHE_FALLBACK = 'public, max-age=300'

/**
 * `GET /og/:key.png` — 1200×630 link-preview card for a plate or VIN (`default` = generic site card).
 * Rendered on demand and kept in an in-memory LRU; only crawlers/unfurlers ever request it, once per shared link.
 */
@ApiExcludeController()
@Controller('og')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class OgController {
  private readonly env = loadEnv()
  private readonly assetsDir = this.env.WEB_DIST_DIR ? resolve(this.env.WEB_DIST_DIR) : DEV_PUBLIC_DIR
  private fontFilesFound: string[] = []
  private readonly pngCache = new Lru<Buffer>(PNG_CACHE_MAX)

  constructor(@Inject(PreviewService) private readonly previews: PreviewService) {}

  @Get(':file')
  async card(
    @Param('file') file: string,
    @Query('lang') langParam: string | undefined,
    @Res() reply: FastifyReply
  ): Promise<void> {
    const lang = resolveLang(langParam)
    const key = decodeURIComponent(file).replace(/\.png$/i, '')
    const isDefault = key === 'default'
    const preview = isDefault ? null : await this.previews.describe(key, lang)

    const cacheKey = `${lang}:${preview ? preview.value : 'default'}`
    const fontFiles = this.fontFiles()
    let png = this.pngCache.get(cacheKey)
    if (!png) {
      png = renderPng(this.svgFor(preview, lang), fontFiles)
      // A card rendered without fonts has no text: never keep it in memory or let the edge cache it for a day.
      if (fontFiles.length > 0) this.pngCache.set(cacheKey, png)
    }
    reply
      .type('image/png')
      .header('cache-control', (preview || isDefault) && fontFiles.length > 0 ? CACHE_OK : CACHE_FALLBACK)
      .send(png)
  }

  /** Looked up on demand, not at boot: on a first deploy the api can start before the web build (`fonts/`) exists. */
  private fontFiles(): string[] {
    if (this.fontFilesFound.length === 0) {
      this.fontFilesFound = ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf']
        .map(f => join(this.assetsDir, 'fonts', f))
        .filter(existsSync)
    }
    return this.fontFilesFound
  }

  private svgFor(preview: Awaited<ReturnType<PreviewService['describe']>>, lang: Lang): string {
    const siteIconPng = readLogo(join(this.assetsDir, 'brand-icon.png'))
    if (!preview) {
      const [title, subtitle] = TAGLINE[lang]
      return buildCardSvg({ plate: null, title, subtitle, color: 'blue', siteIconPng })
    }
    const logoPng = preview.brandSlug ? readLogo(join(this.assetsDir, 'logos', `${preview.brandSlug}.png`)) : null
    return buildCardSvg({ ...preview.card, logoPng, siteIconPng })
  }
}
