import { Controller, Get, Header, Inject } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'

import { CatalogService } from '../catalog/catalog.service.js'
import { loadEnv } from '../env.js'
import { INDEXNOW_KEY } from './indexnow.js'
import { renderCatalogSitemap, renderRobots, renderSitemap, renderSitemapIndex } from './sitemap.js'

/** Generated from PUBLIC_SITE_URL so the absolute URLs match the environment (the static robots.txt can't know it). */
@ApiExcludeController()
@Controller()
export class SeoController {
  private readonly siteUrl = loadEnv().PUBLIC_SITE_URL.replace(/\/+$/, '')

  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get('sitemap.xml')
  @Header('content-type', 'application/xml; charset=utf-8')
  @Header('cache-control', 'public, max-age=86400')
  sitemap(): string {
    return renderSitemapIndex(this.siteUrl)
  }

  @Get('sitemap-pages.xml')
  @Header('content-type', 'application/xml; charset=utf-8')
  @Header('cache-control', 'public, max-age=86400')
  sitemapPages(): string {
    return renderSitemap(this.siteUrl)
  }

  @Get('sitemap-cars.xml')
  @Header('content-type', 'application/xml; charset=utf-8')
  @Header('cache-control', 'public, max-age=86400')
  async sitemapCars(): Promise<string> {
    return renderCatalogSitemap(this.siteUrl, await this.catalog.indexable(), await this.catalog.indexableMakes())
  }

  @Get('robots.txt')
  @Header('content-type', 'text/plain; charset=utf-8')
  @Header('cache-control', 'public, max-age=86400')
  robots(): string {
    return renderRobots(this.siteUrl)
  }

  /** IndexNow key file: the body is the key itself, which proves we own the host. */
  @Get(`${INDEXNOW_KEY}.txt`)
  @Header('content-type', 'text/plain; charset=utf-8')
  @Header('cache-control', 'public, max-age=86400')
  indexNowKey(): string {
    return INDEXNOW_KEY
  }
}
