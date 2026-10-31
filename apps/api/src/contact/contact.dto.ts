import { createZodDto } from 'nestjs-zod'
import { contactConfigSchema } from '@carplates/shared'

export class ContactConfigDto extends createZodDto(contactConfigSchema) {}
