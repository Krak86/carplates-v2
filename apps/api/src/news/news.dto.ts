import { createZodDto } from 'nestjs-zod'
import { newsFeedPageResponseSchema, newsFeedResponseSchema } from '@carplates/shared'

export class NewsDto extends createZodDto(newsFeedResponseSchema) {}
export class NewsPageDto extends createZodDto(newsFeedPageResponseSchema) {}
