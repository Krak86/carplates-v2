import { Controller, Get, Header } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'

import { loadEnv } from '../env.js'
import { renderRobots, renderSitemap } from './sitemap.js'

/** Generated from PUBLIC_SITE_URL so the absolute URLs match the environment (the static robots.txt can't know it). */
@ApiExcludeController()
@Controller()
export class SeoController {
  private readonly siteUrl = loadEnv().PUBLIC_SITE_URL.replace(/\/+$/, '')

  @Get('sitemap.xml')
  @Header('content-type', 'application/xml; charset=utf-8')
  @Header('cache-control', 'public, max-age=86400')
  sitemap(): string {
    return renderSitemap(this.siteUrl)
  }

  @Get('robots.txt')
  @Header('content-type', 'text/plain; charset=utf-8')
  @Header('cache-control', 'public, max-age=86400')
  robots(): string {
    return renderRobots(this.siteUrl)
  }
}
