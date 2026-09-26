import { createZodDto } from 'nestjs-zod'
import { kncapRatingsResponseSchema } from '@carplates/shared'

export class KncapRatingsDto extends createZodDto(kncapRatingsResponseSchema) {}
