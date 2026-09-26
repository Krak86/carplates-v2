import { createZodDto } from 'nestjs-zod'
import { wikiInfoResponseSchema } from '@carplates/shared'

export class WikiInfoDto extends createZodDto(wikiInfoResponseSchema) {}
