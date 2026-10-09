import { createZodDto } from 'nestjs-zod'
import { fxResponseSchema } from '@carplates/shared'

export class FxResponseDto extends createZodDto(fxResponseSchema) {}
