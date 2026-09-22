import { createZodDto } from 'nestjs-zod'
import { plateRecognizeResponseSchema } from '@carplates/shared'

export class PlateRecognizeDto extends createZodDto(plateRecognizeResponseSchema) {}
