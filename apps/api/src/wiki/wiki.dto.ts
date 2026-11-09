import { createZodDto } from 'nestjs-zod'
import {
  wikiImageResponseSchema,
  wikiInfoResponseSchema,
  wikiPhotosResponseSchema,
  wikiRecolorResponseSchema
} from '@carplates/shared'

export class WikiInfoDto extends createZodDto(wikiInfoResponseSchema) {}
export class WikiImageDto extends createZodDto(wikiImageResponseSchema) {}
export class WikiRecolorDto extends createZodDto(wikiRecolorResponseSchema) {}
export class WikiPhotosDto extends createZodDto(wikiPhotosResponseSchema) {}
