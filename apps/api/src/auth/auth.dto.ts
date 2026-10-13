import { createZodDto } from 'nestjs-zod'
import { authConfigResponseSchema, emailStartResponseSchema, sessionResponseSchema } from '@carplates/shared'

export class SessionDto extends createZodDto(sessionResponseSchema) {}
export class AuthConfigDto extends createZodDto(authConfigResponseSchema) {}
export class EmailStartDto extends createZodDto(emailStartResponseSchema) {}
