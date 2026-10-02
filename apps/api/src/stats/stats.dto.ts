import { createZodDto } from 'nestjs-zod'
import { dataVersionResponseSchema, statsResponseSchema, statsTopResponseSchema } from '@carplates/shared'

/** OpenAPI response model (schema-derived, single source with runtime validation). */
export class StatsResponseDto extends createZodDto(statsResponseSchema) {}

export class StatsTopResponseDto extends createZodDto(statsTopResponseSchema) {}

export class DataVersionResponseDto extends createZodDto(dataVersionResponseSchema) {}
