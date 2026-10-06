import { createZodDto } from 'nestjs-zod'
import { authConfigResponseSchema, sessionResponseSchema } from '@carplates/shared'

export class SessionDto extends createZodDto(sessionResponseSchema) {}
export class AuthConfigDto extends createZodDto(authConfigResponseSchema) {}
