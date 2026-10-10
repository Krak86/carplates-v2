import { createZodDto } from 'nestjs-zod'
import { caRecallsResponseSchema } from '@carplates/shared'

export class CaRecallsResponseDto extends createZodDto(caRecallsResponseSchema) {}
