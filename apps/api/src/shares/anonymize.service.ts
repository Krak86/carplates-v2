import { BadGatewayException, Injectable, PayloadTooLargeException, ServiceUnavailableException } from '@nestjs/common'
import { SHARING_UNAVAILABLE } from '@carplates/shared'

import { alprLocalEnabled, loadEnv } from '../env.js'

// Face blur takes ~0.3 s (0.8 s max) on the VPS; generous for a cold container, well under the proxy's 60 s.
const TIMEOUT_MS = 20_000

/** Client of the ALPR container's `POST /anonymize`: blurs faces and returns a re-encoded, EXIF-free JPEG at the input resolution. */
@Injectable()
export class AnonymizeService {
  private readonly env = loadEnv()

  async anonymize(image: Buffer, mimetype: string): Promise<Buffer> {
    if (!alprLocalEnabled(this.env)) throw new ServiceUnavailableException(SHARING_UNAVAILABLE)
    const form = new FormData()
    form.append('image', new Blob([new Uint8Array(image)], { type: mimetype }), 'photo')
    let res: Response
    try {
      res = await fetch(`${this.env.ALPR_LOCAL_URL}/anonymize`, {
        method: 'POST',
        headers: { accept: 'image/jpeg', ...(this.env.ALPR_API_KEY && { 'x-alpr-key': this.env.ALPR_API_KEY }) },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS)
      })
    } catch (err) {
      throw new BadGatewayException(`Face blur request failed: ${(err as Error).message}`)
    }
    if (res.status === 413) throw new PayloadTooLargeException('Image is too large')
    if (!res.ok) throw new BadGatewayException(`Face blur failed: status ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  }
}
