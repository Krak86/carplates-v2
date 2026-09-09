import { createZodDto } from 'nestjs-zod'
import { vinDecodeResponseSchema } from '@carplates/shared'

export class VinDecodeDto extends createZodDto(vinDecodeResponseSchema) {}
