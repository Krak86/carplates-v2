import { createZodDto } from 'nestjs-zod'
import { fuelEconomyResponseSchema, fuelStatsResponseSchema } from '@carplates/shared'

export class FuelEconomyDto extends createZodDto(fuelEconomyResponseSchema) {}

export class FuelStatsDto extends createZodDto(fuelStatsResponseSchema) {}
