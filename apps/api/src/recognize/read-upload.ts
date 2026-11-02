import { BadRequestException, PayloadTooLargeException } from '@nestjs/common'
import type { FastifyRequest } from 'fastify'

import type { UploadedImage } from './recognize.types.js'

/** The single `image` file of a multipart request (the size limit is `@fastify/multipart`'s, set in main.ts). */
export async function readUpload(req: FastifyRequest): Promise<UploadedImage> {
  const part = await req.file()
  if (!part) throw new BadRequestException('Expected a multipart form with an "image" file field')
  try {
    return { buffer: await part.toBuffer(), mimetype: part.mimetype, filename: part.filename }
  } catch {
    throw new PayloadTooLargeException('Image is too large')
  }
}
