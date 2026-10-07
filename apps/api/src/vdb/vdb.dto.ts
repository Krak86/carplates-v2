import { createZodDto } from 'nestjs-zod'
import { vdbResponseSchema, vdbStatsResponseSchema } from '@carplates/shared'

export class VdbResponseDto extends createZodDto(vdbResponseSchema) {}

export class VdbStatsDto extends createZodDto(vdbStatsResponseSchema) {}
