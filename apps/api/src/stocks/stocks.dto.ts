import { createZodDto } from 'nestjs-zod'
import { stockNewsResponseSchema, stockResponseSchema } from '@carplates/shared'

export class StockDto extends createZodDto(stockResponseSchema) {}
export class StockNewsDto extends createZodDto(stockNewsResponseSchema) {}
