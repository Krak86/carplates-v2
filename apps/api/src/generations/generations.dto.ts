import { createZodDto } from 'nestjs-zod'
import { generationsResponseSchema } from '@carplates/shared'

export class GenerationsResponseDto extends createZodDto(generationsResponseSchema) {}
