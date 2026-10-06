import { createZodDto } from 'nestjs-zod'
import { wikiImageResponseSchema, wikiInfoResponseSchema } from '@carplates/shared'

export class WikiInfoDto extends createZodDto(wikiInfoResponseSchema) {}
export class WikiImageDto extends createZodDto(wikiImageResponseSchema) {}
