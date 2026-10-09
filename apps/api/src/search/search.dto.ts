import { createZodDto } from 'nestjs-zod'
import {
  bodySuggestionsResponseSchema,
  brandSuggestionsResponseSchema,
  modelSuggestionsResponseSchema,
  searchResponseSchema
} from '@carplates/shared'

/** OpenAPI response models (schema-derived, single source with runtime validation). */
export class BodySuggestionsDto extends createZodDto(bodySuggestionsResponseSchema) {}
export class BrandSuggestionsDto extends createZodDto(brandSuggestionsResponseSchema) {}
export class ModelSuggestionsDto extends createZodDto(modelSuggestionsResponseSchema) {}
export class SearchResponseDto extends createZodDto(searchResponseSchema) {}
