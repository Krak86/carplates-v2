import { createZodDto } from 'nestjs-zod'
import { adminUsersResponseSchema, featuresResponseSchema } from '@carplates/shared'

export class FeaturesDto extends createZodDto(featuresResponseSchema) {}
export class AdminUsersDto extends createZodDto(adminUsersResponseSchema) {}
