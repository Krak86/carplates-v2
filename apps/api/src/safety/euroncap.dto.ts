import { createZodDto } from 'nestjs-zod'
import { euroNcapRatingsResponseSchema } from '@carplates/shared'

export class EuroNcapRatingsDto extends createZodDto(euroNcapRatingsResponseSchema) {}
