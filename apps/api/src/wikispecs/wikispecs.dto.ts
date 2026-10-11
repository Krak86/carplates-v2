import { createZodDto } from 'nestjs-zod'
import { wikiSpecsResponseSchema } from '@carplates/shared'

export class WikispecsResponseDto extends createZodDto(wikiSpecsResponseSchema) {}
