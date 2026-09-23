import { createZodDto } from 'nestjs-zod'
import { statsResponseSchema } from '@carplates/shared'

/** OpenAPI response model (schema-derived, single source with runtime validation). */
export class StatsResponseDto extends createZodDto(statsResponseSchema) {}
