import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'

import {
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException
} from '@nestjs/common'
import {
  SHARE_EXPIRED,
  SHARE_LIMIT_REACHED,
  SHARE_MAX_UPLOAD_BYTES,
  SHARE_NO_PLATE,
  SHARE_TTL_DAYS,
  SHARING_UNAVAILABLE,
  normalizePlate,
  shareMaxActive,
  shareTokenSchema
} from '@carplates/shared'
import type {
  CreateShareResponse,
  MySharesResponse,
  PlateCandidate,
  ShareMetaResponse,
  ShareRemoved
} from '@carplates/shared'

import { loadEnv, sharesEnabled } from '../env.js'
import { LocalRecognizeService } from '../recognize/local-recognize.service.js'
import type { UploadedImage } from '../recognize/recognize.types.js'
import { AnonymizeService } from './anonymize.service.js'
import {
  SHARE_STORAGE_CAP_BYTES,
  cacheSecondsLeft,
  downscaleForShare,
  findForbiddenMetadata,
  hashShareToken,
  imageSize,
  newShareToken,
  sniffShareFormat
} from './helpers.js'
import { SharesRepository } from './shares.repository.js'
import { SHARE_OBJECT_STORE } from './types.js'
import type { ShareMeta, ShareObjectStore, ShareRecord } from './types.js'

const DAY_MS = 24 * 60 * 60 * 1000
/** The owner's thumbnails may be reused briefly (a deleted share must disappear soon). */
const OWN_IMAGE_MAX_AGE_S = 300

const toSize = (s: { width: number | null; height: number | null }): ShareRemoved['originalSize'] =>
  s.width && s.height ? { width: s.width, height: s.height } : null

export type ShareImage = { stream: Readable; length: number | null; maxAgeS: number }

/**
 * Shareable photo-search links (PLAN.md "Shareable photo-search links"). The client sends only the photo: the server
 * re-runs the ALPR itself (a photo with no plate is refused, so this is no general image host), blurs faces, stores a
 * 1600 px copy in a private bucket and hands back a capability token whose SHA-256 is all that is kept.
 * Never log the image, the token, or a plate together with a user.
 */
@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name)
  private readonly env = loadEnv()

  constructor(
    @Inject(SharesRepository) private readonly repo: SharesRepository,
    @Inject(SHARE_OBJECT_STORE) private readonly store: ShareObjectStore,
    @Inject(LocalRecognizeService) private readonly recognizer: LocalRecognizeService,
    @Inject(AnonymizeService) private readonly anonymizer: AnonymizeService
  ) {}

  async create(userId: string, upload: UploadedImage, role?: string): Promise<CreateShareResponse> {
    if (!sharesEnabled(this.env)) throw new ServiceUnavailableException(SHARING_UNAVAILABLE)
    const format = this.validateUpload(upload.buffer)
    const max = shareMaxActive(role)

    // Cheap refusals before the ALPR + blur work.
    if ((await this.repo.countActive(userId)) >= max) throw new ConflictException(SHARE_LIMIT_REACHED)
    if ((await this.repo.activeBytes()) >= SHARE_STORAGE_CAP_BYTES)
      throw new ServiceUnavailableException(SHARING_UNAVAILABLE)

    // The server's own reads of the exact uploaded bytes; nothing the client says about the plate is used.
    const candidates = await this.recognizePlates({ ...upload, mimetype: `image/${format}` })
    const plate = normalizePlate(candidates[0]?.plate ?? '')
    if (!plate) throw new UnprocessableEntityException(SHARE_NO_PLATE)

    const original = await imageSize(upload.buffer)
    const { image: blurred, faces } = await this.anonymizer.anonymize(upload.buffer, `image/${format}`)
    const stored = await downscaleForShare(blurred)
    if (!stored) throw new UnprocessableEntityException('Photo is too detailed to share')

    const size = await imageSize(stored)
    const removed: ShareRemoved = {
      facesBlurred: faces,
      originalSize: toSize(original),
      storedSize: toSize(size)
    }
    const token = newShareToken()
    const id = randomUUID()
    const objectKey = `shares/${id}.jpg`
    const expiresAt = new Date(Date.now() + SHARE_TTL_DAYS * DAY_MS)
    await this.store.put(objectKey, stored, 'image/jpeg')
    let inserted = false
    try {
      inserted = await this.repo.insertUnderCap(
        {
          id,
          userId,
          tokenHash: hashShareToken(token),
          objectKey,
          plate,
          candidates,
          bytes: stored.byteLength,
          width: size.width,
          height: size.height,
          removed,
          expiresAt
        },
        max
      )
    } finally {
      // No row, no object: a lost race for the last slot, or a failed insert, must not leave the photo in the bucket.
      if (!inserted) await this.deleteObject(objectKey)
    }
    if (!inserted) throw new ConflictException(SHARE_LIMIT_REACHED)
    return { id, token, plate, candidates, expiresAt: expiresAt.toISOString(), removed }
  }

  async listMine(userId: string, role?: string): Promise<MySharesResponse> {
    const rows = await this.repo.listActive(userId)
    return {
      shares: rows.map(r => ({
        id: r.id,
        plate: r.plate,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        removed: r.removed,
        candidates: r.candidates
      })),
      max: shareMaxActive(role)
    }
  }

  /** Removes the row (the link stops working at once) and then the stored object. */
  async remove(userId: string, id: string): Promise<void> {
    const row = await this.repo.deleteOwned(userId, id)
    if (!row) throw new NotFoundException('Share not found')
    await this.deleteObject(row.objectKey)
  }

  /** The owner's own copy by share id (thumbnails in My shared photos; the token is not kept, so it cannot be used there). */
  async ownImage(userId: string, id: string): Promise<ShareImage> {
    const row = await this.repo.findActiveOwned(userId, id)
    if (!row) throw new NotFoundException('Share not found')
    const object = await this.store.get(row.objectKey)
    if (!object) throw new NotFoundException('Share not found')
    return { ...object, maxAgeS: Math.min(cacheSecondsLeft(row.expiresAt), OWN_IMAGE_MAX_AGE_S) }
  }

  async describe(token: string): Promise<ShareMetaResponse> {
    const row = await this.live(token)
    return { plate: row.plate, candidates: row.candidates, expiresAt: row.expiresAt.toISOString() }
  }

  /** The stored photo, streamed; `maxAgeS` is what the response may be cached for (never longer than the time left). */
  async image(token: string): Promise<ShareImage> {
    const row = await this.live(token)
    const object = await this.store.get(row.objectKey)
    if (!object) throw new GoneException(SHARE_EXPIRED)
    return { ...object, maxAgeS: cacheSecondsLeft(row.expiresAt) }
  }

  /** For the SPA's `<meta>` injection: `null` when the link is expired, deleted or was never valid. */
  async metaFor(token: string): Promise<ShareMeta> {
    try {
      const { plate, expiresAt, width, height } = await this.live(token)
      return { plate, expiresAt, width, height }
    } catch (err) {
      if (err instanceof GoneException) return null
      throw err
    }
  }

  /** Format, size and metadata checks on the raw bytes; returns the sniffed format. */
  private validateUpload(buffer: Buffer): 'jpeg' | 'webp' {
    if (buffer.byteLength === 0) throw new BadRequestException('Uploaded image is empty')
    if (buffer.byteLength > SHARE_MAX_UPLOAD_BYTES) throw new PayloadTooLargeException('Image is too large')
    const format = sniffShareFormat(buffer)
    if (!format) throw new UnsupportedMediaTypeException('Only JPEG and WebP photos can be shared')
    const forbidden = findForbiddenMetadata(buffer, format)
    if (forbidden) throw new BadRequestException(`Photo still carries metadata (${forbidden})`)
    return format
  }

  private async recognizePlates(image: UploadedImage): Promise<PlateCandidate[]> {
    try {
      return (await this.recognizer.recognize(image, { documentFallback: false })).candidates
    } catch (err) {
      if (err instanceof NotFoundException) throw new UnprocessableEntityException(SHARE_NO_PLATE)
      throw err
    }
  }

  /** The share behind a token while it is live; expired, revoked, deleted and unknown all look the same (410). */
  private async live(token: string): Promise<ShareRecord> {
    if (!shareTokenSchema.safeParse(token).success) throw new GoneException(SHARE_EXPIRED)
    const row = await this.repo.findByTokenHash(hashShareToken(token))
    if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now()) throw new GoneException(SHARE_EXPIRED)
    return row
  }

  private async deleteObject(key: string): Promise<void> {
    try {
      await this.store.delete(key)
    } catch (err) {
      // The row is already gone, so the link is dead; the bucket lifecycle rule (8 days) is the backstop.
      this.logger.warn(`Share object delete failed: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
}
