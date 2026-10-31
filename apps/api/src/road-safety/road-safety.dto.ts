import { createZodDto } from 'nestjs-zod'
import {
  roadSafetyCausesResponseSchema,
  roadSafetyHazardsResponseSchema,
  roadSafetyRegionsResponseSchema,
  roadSafetyRoadsResponseSchema,
  roadSafetyTimeResponseSchema
} from '@carplates/shared'

export class RoadSafetyRegionsDto extends createZodDto(roadSafetyRegionsResponseSchema) {}

export class RoadSafetyRoadsDto extends createZodDto(roadSafetyRoadsResponseSchema) {}

export class RoadSafetyCausesDto extends createZodDto(roadSafetyCausesResponseSchema) {}

export class RoadSafetyTimeDto extends createZodDto(roadSafetyTimeResponseSchema) {}

export class RoadSafetyHazardsDto extends createZodDto(roadSafetyHazardsResponseSchema) {}
