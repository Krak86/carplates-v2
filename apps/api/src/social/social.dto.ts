import { createZodDto } from 'nestjs-zod'
import { socialResponseSchema } from '@carplates/shared'

export class SocialDto extends createZodDto(socialResponseSchema) {}
