import { BadRequestException, Controller, Inject, PayloadTooLargeException, Post, Req, UseGuards } from '@nestjs/common'
import { ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { FastifyRequest } from 'fastify'

import { CloudRecognizeService } from './cloud-recognize.service.js'
import { LocalRecognizeService } from './local-recognize.service.js'
import { PlateRecognizeDto } from './recognize.dto.js'

async function readUpload(req: FastifyRequest): Promise<{ buffer: Buffer; mimetype: string; filename: string }> {
  const part = await req.file()
  if (!part) throw new BadRequestException('Expected a multipart form with an "image" file field')
  try {
    return { buffer: await part.toBuffer(), mimetype: part.mimetype, filename: part.filename }
  } catch {
    throw new PayloadTooLargeException('Image is too large')
  }
}

@ApiTags('recognize')
@Controller('api/recognize/plate')
export class RecognizeController {
  constructor(
    @Inject(CloudRecognizeService) private readonly cloud: CloudRecognizeService,
    @Inject(LocalRecognizeService) private readonly local: LocalRecognizeService
  ) {}

  @Post('local')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PlateRecognizeDto })
  async recognizeLocal(@Req() req: FastifyRequest): Promise<PlateRecognizeDto> {
    return this.local.recognize(await readUpload(req))
  }

  @Post('cloud')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: PlateRecognizeDto })
  async recognizeCloud(@Req() req: FastifyRequest): Promise<PlateRecognizeDto> {
    return this.cloud.recognize(await readUpload(req))
  }
}
