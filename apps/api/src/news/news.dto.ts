import { createZodDto } from 'nestjs-zod'
import { newsResponseSchema } from '@carplates/shared'

export class NewsDto extends createZodDto(newsResponseSchema) {}
