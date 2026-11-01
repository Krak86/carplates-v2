import { createZodDto } from 'nestjs-zod'
import { stockNewsResponseSchema, stockQuoteResponseSchema, stockResponseSchema } from '@carplates/shared'

export class StockDto extends createZodDto(stockResponseSchema) {}
export class StockQuoteDto extends createZodDto(stockQuoteResponseSchema) {}
export class StockNewsDto extends createZodDto(stockNewsResponseSchema) {}
