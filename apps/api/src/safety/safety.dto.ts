import { createZodDto } from 'nestjs-zod'
import { safetyRatingsResponseSchema } from '@carplates/shared'

export class SafetyRatingsDto extends createZodDto(safetyRatingsResponseSchema) {}
