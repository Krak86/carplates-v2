import { createZodDto } from 'nestjs-zod'
import { dataStatusResponseSchema } from '@carplates/shared'

export class DataStatusResponseDto extends createZodDto(dataStatusResponseSchema) {}
