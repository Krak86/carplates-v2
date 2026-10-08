import { createZodDto } from 'nestjs-zod'
import { rdwResponseSchema } from '@carplates/shared'

export class RdwResponseDto extends createZodDto(rdwResponseSchema) {}
