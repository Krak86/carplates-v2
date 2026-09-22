import { Injectable, NotImplementedException } from '@nestjs/common'
import type { PlateRecognizeResponse } from '@carplates/shared'

import type { UploadedImage } from './recognize.types.js'

/**
 * Stub for platerecognizer's self-hosted On-Premise SDK (a Docker container
 * run on our own VPS, no per-lookup cost — see PLAN.md Phase 4). Once that
 * container exists, this follows the same request shape as
 * CloudRecognizeService (multipart field "upload", same mapPlateReaderResults)
 * against PLATE_RECOGNIZER_ONPREM_URL, minus the monthly budget check (the
 * SDK has no call-rate cap since it's license- not lookup-billed). Whether it
 * needs an Authorization header at all isn't clearly documented — verify
 * against the interactive API reference before wiring this up for real.
 */
@Injectable()
export class OnPremRecognizeService {
  recognize(_image: UploadedImage): Promise<PlateRecognizeResponse> {
    throw new NotImplementedException(
      'On-premise plate recognition needs the Platerecognizer SDK container running on the VPS — see PLAN.md Phase 4'
    )
  }
}
