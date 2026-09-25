import { createZodDto } from 'nestjs-zod'
import { jncapRatingsResponseSchema } from '@carplates/shared'

export class JncapRatingsDto extends createZodDto(jncapRatingsResponseSchema) {}
