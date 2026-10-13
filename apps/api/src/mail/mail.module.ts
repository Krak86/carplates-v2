import { Global, Module } from '@nestjs/common'

import { loadEnv } from '../env.js'

import { MailPreviewController } from './mail-preview.controller.js'
import { MailService } from './mail.service.js'

/** Global so AuthService can mail without importing the module everywhere. */
@Global()
@Module({
  controllers: loadEnv().NODE_ENV === 'production' ? [] : [MailPreviewController],
  providers: [MailService],
  exports: [MailService]
})
export class MailModule {}
