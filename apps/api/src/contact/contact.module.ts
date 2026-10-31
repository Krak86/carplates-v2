import { Module } from '@nestjs/common'

import { ContactController } from './contact.controller.js'
import { ContactService } from './contact.service.js'

/** MailService (MailModule) and TurnstileService (AuthModule) are global exports. */
@Module({
  controllers: [ContactController],
  providers: [ContactService]
})
export class ContactModule {}
