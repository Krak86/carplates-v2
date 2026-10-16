import { createZodDto } from 'nestjs-zod'
import { generationGrowthResponseSchema, generationsResponseSchema } from '@carplates/shared'

export class GenerationsResponseDto extends createZodDto(generationsResponseSchema) {}
export class GenerationGrowthResponseDto extends createZodDto(generationGrowthResponseSchema) {}
