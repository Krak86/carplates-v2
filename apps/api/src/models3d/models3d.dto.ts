import { createZodDto } from 'nestjs-zod'
import { models3dResponseSchema } from '@carplates/shared'

export class Models3dDto extends createZodDto(models3dResponseSchema) {}
