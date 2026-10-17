import { createZodDto } from 'nestjs-zod'
import { wantedResponseSchema, wantedStatsResponseSchema } from '@carplates/shared'

export class WantedResponseDto extends createZodDto(wantedResponseSchema) {}
export class WantedStatsResponseDto extends createZodDto(wantedStatsResponseSchema) {}
