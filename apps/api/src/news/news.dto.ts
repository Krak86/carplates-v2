import { createZodDto } from 'nestjs-zod'
import { newsPageResponseSchema, newsResponseSchema } from '@carplates/shared'

export class NewsDto extends createZodDto(newsResponseSchema) {}
export class NewsPageDto extends createZodDto(newsPageResponseSchema) {}
