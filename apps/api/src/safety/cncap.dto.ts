import { createZodDto } from 'nestjs-zod'
import { cncapRatingsResponseSchema } from '@carplates/shared'

export class CncapRatingsDto extends createZodDto(cncapRatingsResponseSchema) {}
