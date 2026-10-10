import { createZodDto } from 'nestjs-zod'
import { nhtsaComplaintsResponseSchema, nhtsaRecallsResponseSchema } from '@carplates/shared'

export class NhtsaRecallsResponseDto extends createZodDto(nhtsaRecallsResponseSchema) {}
export class NhtsaComplaintsResponseDto extends createZodDto(nhtsaComplaintsResponseSchema) {}
