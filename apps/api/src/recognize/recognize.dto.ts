import { createZodDto } from 'nestjs-zod'
import { plateRecognizeResponseSchema, vinRecognizeResponseSchema } from '@carplates/shared'

export class PlateRecognizeDto extends createZodDto(plateRecognizeResponseSchema) {}
export class VinRecognizeDto extends createZodDto(vinRecognizeResponseSchema) {}
