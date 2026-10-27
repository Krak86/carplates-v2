import { createZodDto } from 'nestjs-zod'
import { riaCheckResponseSchema } from '@carplates/shared'

export class RiaCheckDto extends createZodDto(riaCheckResponseSchema) {}
