import { createZodDto } from 'nestjs-zod'
import { originResponseSchema } from '@carplates/shared'

export class OriginResponseDto extends createZodDto(originResponseSchema) {}
