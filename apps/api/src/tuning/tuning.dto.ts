import { createZodDto } from 'nestjs-zod'
import { tuningResponseSchema } from '@carplates/shared'

export class TuningResponseDto extends createZodDto(tuningResponseSchema) {}
