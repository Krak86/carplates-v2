import { BadRequestException, Controller, Inject, PayloadTooLargeException, Post, Req, UseGuards } from '@nestjs/common'
import { ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { FastifyRequest } from 'fastify'

import { CloudRecognizeService } from './cloud-recognize.service.js'
import { PlateRecognizeDto } from './recognize.dto.js'

@ApiTags('recognize')
@Controller('api/recognize/plate')
export class RecognizeController {
  constructor(@Inject(CloudRecognizeService) private readonly cloud: CloudRecognizeService) {}

  @Post('cloud')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PlateRecognizeDto })
  async recognizeCloud(@Req() req: FastifyRequest): Promise<PlateRecognizeDto> {
    const part = await req.file()
    if (!part) throw new BadRequestException('Expected a multipart form with an "image" file field')
    let buffer: Buffer
    try {
      buffer = await part.toBuffer()
    } catch {
      throw new PayloadTooLargeException('Image is too large')
    }
    return this.cloud.recognize({ buffer, mimetype: part.mimetype, filename: part.filename })
  }
}
