import { createZodDto } from 'nestjs-zod'
import { vehiclePhotosResponseSchema } from '@carplates/shared'

export class VehiclePhotosDto extends createZodDto(vehiclePhotosResponseSchema) {}
