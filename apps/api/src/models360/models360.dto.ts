import { createZodDto } from 'nestjs-zod'
import { models360ResponseSchema } from '@carplates/shared'

export class Models360Dto extends createZodDto(models360ResponseSchema) {}
