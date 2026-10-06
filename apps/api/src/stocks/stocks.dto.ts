import { createZodDto } from 'nestjs-zod'
import { stockResponseSchema } from '@carplates/shared'

export class StockDto extends createZodDto(stockResponseSchema) {}
