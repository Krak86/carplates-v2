import { createZodDto } from 'nestjs-zod'
import { plateHistoryResponseSchema, plateLookupResponseSchema, registrationSchema } from '@carplates/shared'
import type { Registration } from '@carplates/shared'

/** OpenAPI response models (schema-derived, single source with runtime validation). */
export class PlateLookupDto extends createZodDto(plateLookupResponseSchema) {}
export class PlateHistoryDto extends createZodDto(plateHistoryResponseSchema) {}

/** Drizzle row (table or materialized view) → validated Registration DTO; drops id / source_resource_id. */
export function toRegistrationDto(row: Record<string, unknown>): Registration {
  return registrationSchema.parse(row)
}
