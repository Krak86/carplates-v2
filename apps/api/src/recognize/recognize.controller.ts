import { Controller, Inject, Post, Req, UseGuards } from '@nestjs/common'
import { ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { FastifyRequest } from 'fastify'

import { CloudRecognizeService } from './cloud-recognize.service.js'
import { LocalRecognizeService } from './local-recognize.service.js'
import { PlateRecognizeDto, VinRecognizeDto } from './recognize.dto.js'
import { readUpload } from './read-upload.js'
import { VinRecognizeService } from './vin-recognize.service.js'

@ApiTags('recognize')
@Controller('api/recognize')
export class RecognizeController {
  constructor(
    @Inject(CloudRecognizeService) private readonly cloud: CloudRecognizeService,
    @Inject(LocalRecognizeService) private readonly local: LocalRecognizeService,
    @Inject(VinRecognizeService) private readonly vin: VinRecognizeService
  ) {}

  @Post('plate/local')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PlateRecognizeDto })
  async recognizeLocal(@Req() req: FastifyRequest): Promise<PlateRecognizeDto> {
    return this.local.recognize(await readUpload(req))
  }

  @Post('plate/cloud')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PlateRecognizeDto })
  async recognizeCloud(@Req() req: FastifyRequest): Promise<PlateRecognizeDto> {
    return this.cloud.recognize(await readUpload(req))
  }

  @Post('vin')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: VinRecognizeDto })
  async recognizeVin(@Req() req: FastifyRequest): Promise<VinRecognizeDto> {
    return this.vin.recognize(await readUpload(req))
  }
}
