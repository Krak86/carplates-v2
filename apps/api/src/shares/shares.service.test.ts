import { Readable } from 'node:stream'

import {
  BadRequestException,
  ConflictException,
  GoneException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException
} from '@nestjs/common'
import type { PlateCandidate } from '@carplates/shared'
import { SHARE_MAX_ACTIVE, SHARE_MAX_ACTIVE_ADMIN, SHARE_MAX_UPLOAD_BYTES, SHARE_TTL_DAYS } from '@carplates/shared'
import sharp from 'sharp'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { sharesEnabled } from '../env.js'
import type { Env } from '../env.js'
import type { LocalRecognizeService } from '../recognize/local-recognize.service.js'
import type { AnonymizeService } from './anonymize.service.js'
import { SHARE_STORAGE_CAP_BYTES, hashShareToken, newShareToken } from './helpers.js'
import { SharesService } from './shares.service.js'
import type { SharesRepository } from './shares.repository.js'
import type { NewShare, ShareObjectStore, ShareRecord } from './types.js'

vi.stubEnv('ALPR_LOCAL_URL', 'http://alpr:8088')
vi.stubEnv('SHARES_R2_ENDPOINT', 'https://acct.r2.cloudflarestorage.com')
vi.stubEnv('SHARES_R2_ACCESS_KEY_ID', 'id')
vi.stubEnv('SHARES_R2_SECRET_ACCESS_KEY', 'secret')

const candidates: PlateCandidate[] = [
  { plate: 'АА1234ВВ', raw: 'AA1234BB', score: 0.93, box: { x: 0.4, y: 0.5, w: 0.2, h: 0.05 } }
]

let jpeg: Buffer
let blurred: Buffer
beforeAll(async () => {
  const pixels = Buffer.alloc(64 * 64 * 3, 120)
  jpeg = await sharp(pixels, { raw: { width: 64, height: 64, channels: 3 } })
    .jpeg()
    .toBuffer()
  blurred = await sharp(Buffer.alloc(3000 * 2000 * 3, 120), { raw: { width: 3000, height: 2000, channels: 3 } })
    .jpeg()
    .toBuffer()
})

const upload = () => ({ buffer: jpeg, mimetype: 'image/jpeg', filename: 'x.jpg' })

function setup() {
  const repo = {
    countActive: vi.fn(async () => 0),
    activeBytes: vi.fn(async () => 0),
    insertUnderCap: vi.fn(async (_share: NewShare, _max: number) => true),
    listActive: vi.fn(async () => [] as ShareRecord[]),
    findByTokenHash: vi.fn(async () => null as ShareRecord | null),
    deleteOwned: vi.fn(async () => null as ShareRecord | null),
    findActiveOwned: vi.fn(async () => null as ShareRecord | null),
    updateRetouched: vi.fn(async () => true),
    clearOriginal: vi.fn(async () => null as string | null)
  }
  const store: ShareObjectStore = {
    put: vi.fn(async () => undefined),
    get: vi.fn(
      async () =>
        ({ stream: Readable.from(['jpeg-bytes']), length: 10 }) as { stream: Readable; length: number | null } | null
    ),
    delete: vi.fn(async () => undefined)
  }
  const recognizer = { recognize: vi.fn(async () => ({ candidates })) }
  const anonymizer = { anonymize: vi.fn(async () => ({ image: blurred, faces: 2 })) }
  const service = new SharesService(
    repo as unknown as SharesRepository,
    store,
    recognizer as unknown as LocalRecognizeService,
    anonymizer as unknown as AnonymizeService
  )
  return { service, repo, store, recognizer, anonymizer }
}

const record = (over: Partial<ShareRecord> = {}): ShareRecord => ({
  id: '3b0f7c1e-6f0b-4c6e-9b53-0a1f9a5f6a11',
  userId: 'u1',
  objectKey: 'shares/3b0f7c1e-6f0b-4c6e-9b53-0a1f9a5f6a11.jpg',
  plate: 'АА1234ВВ',
  candidates,
  bytes: 1000,
  width: 1600,
  height: 900,
  removed: null,
  originalKey: null,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 3 * 86_400_000),
  revokedAt: null,
  ...over
})

describe('SharesService.create', () => {
  let s: ReturnType<typeof setup>
  beforeEach(() => {
    s = setup()
  })

  it('re-runs the ALPR on the upload, blurs, stores a downscaled JPEG and keeps only the token hash', async () => {
    const res = await s.service.create('u1', upload())

    expect(s.recognizer.recognize).toHaveBeenCalledWith(expect.objectContaining({ buffer: jpeg }), {
      documentFallback: false
    })
    expect(s.anonymizer.anonymize).toHaveBeenCalledWith(jpeg, 'image/jpeg')

    expect(res.token).toMatch(/^[A-Za-z0-9_-]{22}$/)
    expect(res.plate).toBe('АА1234ВВ')
    expect(res.candidates).toEqual(candidates)
    expect(res.removed).toEqual({
      facesBlurred: 2,
      originalSize: { width: 64, height: 64 },
      storedSize: { width: 1600, height: 1067 }
    })
    const days = (Date.parse(res.expiresAt) - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(SHARE_TTL_DAYS - 0.01)
    expect(days).toBeLessThanOrEqual(SHARE_TTL_DAYS)

    const [key, body, type] = vi.mocked(s.store.put).mock.calls[0] ?? []
    expect(key).toBe(`shares/${res.id}.jpg`)
    expect(type).toBe('image/jpeg')
    expect((await sharp(body as Buffer).metadata()).width).toBe(1600) // 3000 px blurred original -> 1600 px copy

    const [row, max] = s.repo.insertUnderCap.mock.calls[0] ?? []
    expect(max).toBe(SHARE_MAX_ACTIVE)
    expect(row).toMatchObject({
      id: res.id,
      userId: 'u1',
      plate: 'АА1234ВВ',
      objectKey: key,
      bytes: (body as Buffer).byteLength
    })
    expect((row as { tokenHash: string }).tokenHash).toBe(hashShareToken(res.token))
    expect(JSON.stringify(row)).not.toContain(res.token)
  })

  it('lets an admin go past the regular cap, up to the admin cap', async () => {
    s.repo.countActive.mockResolvedValue(SHARE_MAX_ACTIVE)
    await expect(s.service.create('u1', upload(), 'admin')).resolves.toMatchObject({ plate: 'АА1234ВВ' })
    expect((await s.service.listMine('u1', 'admin')).max).toBe(SHARE_MAX_ACTIVE_ADMIN)
    s.repo.countActive.mockResolvedValue(SHARE_MAX_ACTIVE_ADMIN)
    await expect(s.service.create('u1', upload(), 'admin')).rejects.toBeInstanceOf(ConflictException)
  })

  it('refuses at the per-user cap before doing any ALPR or blur work', async () => {
    s.repo.countActive.mockResolvedValue(SHARE_MAX_ACTIVE)
    await expect(s.service.create('u1', upload())).rejects.toMatchObject({
      response: { message: 'SHARE_LIMIT_REACHED' }
    })
    await expect(s.service.create('u1', upload())).rejects.toBeInstanceOf(ConflictException)
    expect(s.recognizer.recognize).not.toHaveBeenCalled()
    expect(s.anonymizer.anonymize).not.toHaveBeenCalled()
    expect(s.store.put).not.toHaveBeenCalled()
  })

  it('refuses with "unavailable" once the global storage guard is reached', async () => {
    s.repo.activeBytes.mockResolvedValue(SHARE_STORAGE_CAP_BYTES)
    await expect(s.service.create('u1', upload())).rejects.toBeInstanceOf(ServiceUnavailableException)
    expect(s.recognizer.recognize).not.toHaveBeenCalled()
    expect(s.store.put).not.toHaveBeenCalled()
  })

  it('still accepts just under the global guard', async () => {
    s.repo.activeBytes.mockResolvedValue(SHARE_STORAGE_CAP_BYTES - 1)
    await expect(s.service.create('u1', upload())).resolves.toMatchObject({ plate: 'АА1234ВВ' })
  })

  it('deletes the stored object and answers 409 when a parallel upload took the last slot', async () => {
    s.repo.insertUnderCap.mockResolvedValue(false)
    await expect(s.service.create('u1', upload())).rejects.toBeInstanceOf(ConflictException)
    const key = vi.mocked(s.store.put).mock.calls[0]?.[0]
    expect(s.store.delete).toHaveBeenCalledWith(key)
    expect(s.store.delete).toHaveBeenCalledWith(`shares/${key?.slice(7, -4)}.orig`)
  })

  it('keeps the unblurred upload privately for the blur editor', async () => {
    const res = await s.service.create('u1', upload())
    const [key, body, type] = vi.mocked(s.store.put).mock.calls[1] ?? []
    expect(key).toBe(`shares/${res.id}.orig`)
    expect(body).toBe(jpeg)
    expect(type).toBe('image/jpeg')
    expect(s.repo.insertUnderCap.mock.calls[0]?.[0]).toMatchObject({ originalKey: key })
  })

  it('deletes the stored object when the insert fails', async () => {
    s.repo.insertUnderCap.mockRejectedValue(new Error('db down'))
    await expect(s.service.create('u1', upload())).rejects.toThrow('db down')
    expect(s.store.delete).toHaveBeenCalledTimes(2) // the copy and the unblurred upload
  })

  it('rejects a photo with no plate (and never blurs or stores it)', async () => {
    s.recognizer.recognize.mockRejectedValue(new NotFoundException('No plate found in the image'))
    await expect(s.service.create('u1', upload())).rejects.toBeInstanceOf(UnprocessableEntityException)
    await expect(s.service.create('u1', upload())).rejects.toMatchObject({ response: { message: 'SHARE_NO_PLATE' } })
    expect(s.anonymizer.anonymize).not.toHaveBeenCalled()
    expect(s.store.put).not.toHaveBeenCalled()
  })

  it('lets other recognizer failures through (502 stays 502)', async () => {
    s.recognizer.recognize.mockRejectedValue(new Error('alpr down'))
    await expect(s.service.create('u1', upload())).rejects.toThrow('alpr down')
  })

  it('rejects a non JPEG/WebP upload whatever MIME type it claims', async () => {
    const png = await sharp(Buffer.alloc(8 * 8 * 3), { raw: { width: 8, height: 8, channels: 3 } })
      .png()
      .toBuffer()
    await expect(
      s.service.create('u1', { buffer: png, mimetype: 'image/jpeg', filename: 'x.jpg' })
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException)
    expect(s.recognizer.recognize).not.toHaveBeenCalled()
  })

  it('rejects an upload that still carries EXIF/IPTC/comment segments before any other work', async () => {
    const withExif = await sharp(Buffer.alloc(64 * 64 * 3), { raw: { width: 64, height: 64, channels: 3 } })
      .jpeg()
      .withExif({ IFD0: { Copyright: 'someone' } })
      .toBuffer()
    await expect(
      s.service.create('u1', { buffer: withExif, mimetype: 'image/jpeg', filename: 'x.jpg' })
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(s.repo.countActive).not.toHaveBeenCalled()
    expect(s.recognizer.recognize).not.toHaveBeenCalled()
  })

  it('rejects empty and oversized uploads', async () => {
    await expect(s.service.create('u1', { ...upload(), buffer: Buffer.alloc(0) })).rejects.toBeInstanceOf(
      BadRequestException
    )
    const big = Buffer.concat([jpeg.subarray(0, 3), Buffer.alloc(SHARE_MAX_UPLOAD_BYTES)])
    await expect(s.service.create('u1', { ...upload(), buffer: big })).rejects.toBeInstanceOf(PayloadTooLargeException)
  })
})

describe('SharesService reading a link', () => {
  let s: ReturnType<typeof setup>
  beforeEach(() => {
    s = setup()
  })

  it('looks the token up by its hash and returns plate, candidates and expiry', async () => {
    const token = newShareToken()
    const row = record()
    s.repo.findByTokenHash.mockResolvedValue(row)
    const meta = await s.service.describe(token)
    expect(s.repo.findByTokenHash).toHaveBeenCalledWith(hashShareToken(token))
    expect(meta).toEqual({ plate: row.plate, candidates, expiresAt: row.expiresAt.toISOString() })
  })

  it('answers 410 for an expired share, even before the daily job has deleted it', async () => {
    s.repo.findByTokenHash.mockResolvedValue(record({ expiresAt: new Date(Date.now() - 1000) }))
    await expect(s.service.describe(newShareToken())).rejects.toBeInstanceOf(GoneException)
    await expect(s.service.image(newShareToken())).rejects.toBeInstanceOf(GoneException)
    expect(s.store.get).not.toHaveBeenCalled()
  })

  it('answers 410 for a revoked share (admin takedown)', async () => {
    s.repo.findByTokenHash.mockResolvedValue(record({ revokedAt: new Date() }))
    await expect(s.service.describe(newShareToken())).rejects.toBeInstanceOf(GoneException)
  })

  it('answers 410 for an unknown or malformed token without touching the DB for the latter', async () => {
    await expect(s.service.describe(newShareToken())).rejects.toBeInstanceOf(GoneException)
    s.repo.findByTokenHash.mockClear()
    await expect(s.service.describe('not-a-token')).rejects.toBeInstanceOf(GoneException)
    expect(s.repo.findByTokenHash).not.toHaveBeenCalled()
  })

  it('streams the image and allows caching for no longer than the time left', async () => {
    s.repo.findByTokenHash.mockResolvedValue(record({ expiresAt: new Date(Date.now() + 120_000) }))
    const img = await s.service.image(newShareToken())
    expect(s.store.get).toHaveBeenCalledWith(record().objectKey)
    expect(img.length).toBe(10)
    expect(img.maxAgeS).toBeGreaterThan(110)
    expect(img.maxAgeS).toBeLessThanOrEqual(120)
  })

  it('caps the cache time at an hour for a fresh share', async () => {
    s.repo.findByTokenHash.mockResolvedValue(record())
    expect((await s.service.image(newShareToken())).maxAgeS).toBe(3600)
  })

  it('answers 410 when the row is live but the object is gone', async () => {
    s.repo.findByTokenHash.mockResolvedValue(record())
    vi.mocked(s.store.get).mockResolvedValue(null)
    await expect(s.service.image(newShareToken())).rejects.toBeInstanceOf(GoneException)
  })

  it('ownImage serves the owner their own photo (cache capped at 5 min) and 404s otherwise', async () => {
    await expect(s.service.ownImage('u1', record().id)).rejects.toBeInstanceOf(NotFoundException)
    s.repo.findActiveOwned.mockResolvedValue(record())
    expect((await s.service.ownImage('u1', record().id)).maxAgeS).toBe(300)
    expect(s.repo.findActiveOwned).toHaveBeenCalledWith('u1', record().id)
    vi.mocked(s.store.get).mockResolvedValue(null)
    await expect(s.service.ownImage('u1', record().id)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('metaFor is null for a dead link and the plate + expiry for a live one', async () => {
    expect(await s.service.metaFor(newShareToken())).toBeNull()
    const row = record()
    s.repo.findByTokenHash.mockResolvedValue(row)
    expect(await s.service.metaFor(newShareToken())).toEqual({
      plate: row.plate,
      expiresAt: row.expiresAt,
      width: 1600,
      height: 900
    })
  })
})

describe('SharesService my shares', () => {
  let s: ReturnType<typeof setup>
  beforeEach(() => {
    s = setup()
  })

  it('lists the active shares without any token or object key', async () => {
    const row = record()
    s.repo.listActive.mockResolvedValue([row])
    const res = await s.service.listMine('u1')
    expect(res).toEqual({
      shares: [
        {
          id: row.id,
          plate: row.plate,
          createdAt: row.createdAt.toISOString(),
          expiresAt: row.expiresAt.toISOString(),
          removed: null,
          candidates
        }
      ],
      max: SHARE_MAX_ACTIVE
    })
    expect(JSON.stringify(res)).not.toContain('shares/')
  })

  it('delete removes the row and the object at once', async () => {
    const row = record()
    s.repo.deleteOwned.mockResolvedValue(row)
    await s.service.remove('u1', row.id)
    expect(s.repo.deleteOwned).toHaveBeenCalledWith('u1', row.id)
    expect(s.store.delete).toHaveBeenCalledWith(row.objectKey)
  })

  it("delete of somebody else's (or a missing) share is a 404 and removes nothing", async () => {
    await expect(s.service.remove('u2', record().id)).rejects.toBeInstanceOf(NotFoundException)
    expect(s.store.delete).not.toHaveBeenCalled()
  })

  it('delete still succeeds when the object delete fails (the link is already dead; the lifecycle rule is the backstop)', async () => {
    s.repo.deleteOwned.mockResolvedValue(record())
    vi.mocked(s.store.delete).mockRejectedValue(new Error('r2 down'))
    await expect(s.service.remove('u1', record().id)).resolves.toBeUndefined()
  })
})

describe('SharesService blur editor', () => {
  let s: ReturnType<typeof setup>
  const withOriginal = () => record({ originalKey: 'shares/3b0f7c1e-6f0b-4c6e-9b53-0a1f9a5f6a11.orig' })
  beforeEach(() => {
    s = setup()
    s.repo.findActiveOwned.mockResolvedValue(withOriginal())
    vi.mocked(s.store.get).mockImplementation(async () => ({ stream: Readable.from([jpeg]), length: jpeg.byteLength }))
  })

  it('re-renders from the original, replaces the object under the same key and updates the row', async () => {
    const removed = await s.service.retouch('u1', record().id, [{ mode: 'add', radius: 0.05, points: [[0.5, 0.5]] }])
    expect(s.anonymizer.anonymize).toHaveBeenCalledWith(jpeg, 'image/jpeg')
    const [key, body, type] = vi.mocked(s.store.put).mock.calls[0] ?? []
    expect(key).toBe(record().objectKey)
    expect(type).toBe('image/jpeg')
    const meta = await sharp(body as Buffer).metadata()
    expect(s.repo.updateRetouched).toHaveBeenCalledWith('u1', record().id, {
      bytes: (body as Buffer).byteLength,
      width: meta.width,
      height: meta.height,
      removed
    })
    expect(removed).toMatchObject({ facesBlurred: 2, originalSize: { width: 64, height: 64 } })
  })

  it("is a 404 for somebody else's share, a 409 once the original is gone", async () => {
    s.repo.findActiveOwned.mockResolvedValue(null)
    await expect(s.service.retouch('u2', record().id, [])).rejects.toBeInstanceOf(NotFoundException)
    s.repo.findActiveOwned.mockResolvedValue(record())
    await expect(s.service.retouch('u1', record().id, [])).rejects.toBeInstanceOf(ConflictException)
    s.repo.findActiveOwned.mockResolvedValue(withOriginal())
    vi.mocked(s.store.get).mockResolvedValue(null)
    await expect(s.service.retouch('u1', record().id, [])).rejects.toBeInstanceOf(ConflictException)
    expect(s.store.put).not.toHaveBeenCalled()
  })

  it('dropOriginal deletes the unblurred object and is idempotent', async () => {
    s.repo.clearOriginal.mockResolvedValueOnce('shares/x.orig')
    await s.service.dropOriginal('u1', record().id)
    expect(s.store.delete).toHaveBeenCalledWith('shares/x.orig')
    await s.service.dropOriginal('u1', record().id)
    expect(s.store.delete).toHaveBeenCalledTimes(1)
  })

  it('removing a share also removes its unblurred upload', async () => {
    s.repo.deleteOwned.mockResolvedValue(withOriginal())
    await s.service.remove('u1', record().id)
    expect(s.store.delete).toHaveBeenCalledWith(withOriginal().originalKey)
  })
})

describe('sharesEnabled', () => {
  const env = (over: Partial<Env>) => ({ ...over }) as Env

  it('needs the bucket endpoint, both keys and the ALPR container (face blur)', () => {
    const full = {
      SHARES_R2_ENDPOINT: 'https://x',
      SHARES_R2_ACCESS_KEY_ID: 'a',
      SHARES_R2_SECRET_ACCESS_KEY: 'b',
      ALPR_LOCAL_URL: 'http://alpr'
    }
    expect(sharesEnabled(env(full))).toBe(true)
    for (const key of Object.keys(full)) expect(sharesEnabled(env({ ...full, [key]: undefined }))).toBe(false)
  })
})
