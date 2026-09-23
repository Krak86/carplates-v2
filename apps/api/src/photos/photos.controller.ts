import { Controller, Get, Inject, Query } from '@nestjs/common'
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger'
import { z } from 'zod'

import { zodParam } from '../common/zod-param.pipe.js'
import { VehiclePhotosDto } from './photos.dto.js'
import { PhotosService } from './photos.service.js'

const querySchema = z.object({
  brand: z.string().trim().min(1).optional(),
  model: z.string().trim().min(1).optional(),
  year: z.coerce.number().int().optional()
})

@ApiTags('photos')
@Controller('api/photos')
export class PhotosController {
  constructor(@Inject(PhotosService) private readonly photosService: PhotosService) {}

  @Get()
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiOkResponse({ type: VehiclePhotosDto })
  search(@Query(zodParam(querySchema)) query: z.infer<typeof querySchema>): Promise<VehiclePhotosDto> {
    return this.photosService.search(query.brand ?? '', query.model ?? '', query.year)
  }
}
