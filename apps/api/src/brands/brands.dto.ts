import { createZodDto } from 'nestjs-zod'
import { brandPronunciationSchema } from '@carplates/shared'

export class BrandPronunciationDto extends createZodDto(brandPronunciationSchema) {}
