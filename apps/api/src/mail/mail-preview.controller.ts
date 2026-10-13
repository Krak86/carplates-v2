import { Controller, Get, Header, NotFoundException, Param, Query } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'

import { resolveLang } from '../spa/spa-text.js'

import { CODE_MAIL_KINDS, NOTICE_MAIL_KINDS } from './mail-text.js'
import type { MailKind } from './mail-text.js'
import { renderSample } from './render.js'

const ALL_KINDS: readonly string[] = [...CODE_MAIL_KINDS, ...NOTICE_MAIL_KINDS]

/** Dev-only (registered when NODE_ENV != production): `/api/dev/emails/signIn?lang=ua`, `…/signIn.txt` for plain text. */
@ApiExcludeController()
@Controller('api/dev/emails')
export class MailPreviewController {
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string {
    const links = ALL_KINDS.flatMap(kind =>
      ['ua', 'ru', 'en'].map(lang => `<li><a href="/api/dev/emails/${kind}?lang=${lang}">${kind} (${lang})</a></li>`)
    )
    return `<!doctype html><meta charset="utf-8"><title>Email previews</title><ul>${links.join('')}</ul>`
  }

  @Get(':template')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async html(@Param('template') template: string, @Query('lang') lang?: string): Promise<string> {
    return (await this.render(template, lang)).html
  }

  @Get(':template/text')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async text(@Param('template') template: string, @Query('lang') lang?: string): Promise<string> {
    return (await this.render(template, lang)).text
  }

  private async render(template: string, lang: string | undefined): ReturnType<typeof renderSample> {
    if (!ALL_KINDS.includes(template)) throw new NotFoundException('Unknown template')
    return renderSample(template as MailKind, resolveLang(lang))
  }
}
