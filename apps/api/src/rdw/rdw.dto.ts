import { createZodDto } from 'nestjs-zod'
import { rdwRecallsResponseSchema, rdwResponseSchema } from '@carplates/shared'

export class RdwResponseDto extends createZodDto(rdwResponseSchema) {}
export class RdwRecallsResponseDto extends createZodDto(rdwRecallsResponseSchema) {}
