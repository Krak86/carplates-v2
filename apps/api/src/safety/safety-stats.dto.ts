import { createZodDto } from 'nestjs-zod'
import { safetyStatsResponseSchema } from '@carplates/shared'

export class SafetyStatsDto extends createZodDto(safetyStatsResponseSchema) {}
