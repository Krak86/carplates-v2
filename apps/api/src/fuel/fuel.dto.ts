import { createZodDto } from 'nestjs-zod'
import { fuelEconomyResponseSchema, fuelStatsResponseSchema, powertrainStatsResponseSchema } from '@carplates/shared'

export class FuelEconomyDto extends createZodDto(fuelEconomyResponseSchema) {}

export class FuelStatsDto extends createZodDto(fuelStatsResponseSchema) {}

export class PowertrainStatsDto extends createZodDto(powertrainStatsResponseSchema) {}
