import { createZodDto } from 'nestjs-zod'
import { iihsRatingsResponseSchema } from '@carplates/shared'

export class IihsRatingsDto extends createZodDto(iihsRatingsResponseSchema) {}
