import { createZodDto } from 'nestjs-zod'
import { cardBundleResponseSchema } from '@carplates/shared'

export class CardBundleDto extends createZodDto(cardBundleResponseSchema) {}
