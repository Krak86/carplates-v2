import { createZodDto } from 'nestjs-zod'
import { catalogModelSchema } from '@carplates/shared'

export class CatalogModelDto extends createZodDto(catalogModelSchema) {}
