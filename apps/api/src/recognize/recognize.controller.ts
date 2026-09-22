import { BadRequestException, Controller, Inject, PayloadTooLargeException, Post, Req, UseGuards } from '@nestjs/common'
import { ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { PlateRecognizeResponse } from '@carplates/shared'
import type { FastifyRequest } from 'fastify'

import { CloudRecognizeService } from './cloud-recognize.service.js'
import { OnPremRecognizeService } from './on-prem-recognize.service.js'
import { PlateRecognizeDto } from './recognize.dto.js'
import type { UploadedImage } from './recognize.types.js'

@ApiTags('recognize')
@Controller('api/recognize/plate')
export class RecognizeController {
  constructor(
    @Inject(CloudRecognizeService) private readonly cloud: CloudRecognizeService,
    @Inject(OnPremRecognizeService) private readonly onPrem: OnPremRecognizeService
  ) {}

  @Post('cloud')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PlateRecognizeDto })
  recognizeCloud(@Req() req: FastifyRequest): Promise<PlateRecognizeDto> {
    return this.readAndRecognize(req, this.cloud)
  }

  @Post('on-prem')
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PlateRecognizeDto })
  recognizeOnPrem(@Req() req: FastifyRequest): Promise<PlateRecognizeDto> {
    return this.readAndRecognize(req, this.onPrem)
  }

  private async readAndRecognize(
    req: FastifyRequest,
    service: { recognize(image: UploadedImage): Promise<PlateRecognizeResponse> }
  ): Promise<PlateRecognizeDto> {
    const part = await req.file()
    if (!part) throw new BadRequestException('Expected a multipart form with an "image" file field')
    let buffer: Buffer
    try {
      buffer = await part.toBuffer()
    } catch {
      throw new PayloadTooLargeException('Image is too large')
    }
    return service.recognize({ buffer, mimetype: part.mimetype, filename: part.filename })
  }
}
