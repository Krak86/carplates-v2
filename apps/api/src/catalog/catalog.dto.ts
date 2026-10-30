import { createZodDto } from 'nestjs-zod'
import {
  catalogLookupSchema,
  catalogMakeSchema,
  catalogMakesSchema,
  catalogModelSchema,
  catalogYearStatsSchema
} from '@carplates/shared'

export class CatalogModelDto extends createZodDto(catalogModelSchema) {}
export class CatalogYearStatsDto extends createZodDto(catalogYearStatsSchema) {}
export class CatalogLookupDto extends createZodDto(catalogLookupSchema) {}
export class CatalogMakesDto extends createZodDto(catalogMakesSchema) {}
export class CatalogMakeDto extends createZodDto(catalogMakeSchema) {}
