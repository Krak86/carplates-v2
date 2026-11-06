import { createZodDto } from 'nestjs-zod'
import { wikiImageResponseSchema, wikiInfoResponseSchema, wikiRecolorResponseSchema } from '@carplates/shared'

export class WikiInfoDto extends createZodDto(wikiInfoResponseSchema) {}
export class WikiImageDto extends createZodDto(wikiImageResponseSchema) {}
export class WikiRecolorDto extends createZodDto(wikiRecolorResponseSchema) {}
