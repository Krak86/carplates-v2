import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common'

// ffmpeg-static's own .d.ts is authored for ESM default-import but the package
// ships as CJS with no "type" field — under NodeNext that mismatch resolves the
// default import as the whole (single-property) namespace, not the string it
// actually is at runtime. Bypass it with a plain require instead of fighting the types.
const ffmpegPath = createRequire(import.meta.url)('ffmpeg-static') as string | null

// NHTSA only ever serves crash-test clips from this exact host/path shape — anything
// else is rejected before we fetch or spawn ffmpeg on it (no open transcoding proxy, no SSRF).
const NHTSA_VIDEO_URL_PATTERN = /^https:\/\/static\.nhtsa\.gov\/crashTest\/videos\/\d{4}\/[A-Za-z0-9_-]+\.wmv$/

// Outside the repo tree on purpose: apps/api runs under `tsx watch`, which would
// otherwise treat every transcoded file we write as a source change and restart.
const CACHE_DIR = join(tmpdir(), 'carplates-safety-videos')
const CACHE_MAX_FILES = 100
const DOWNLOAD_TIMEOUT_MS = 30_000
const FFMPEG_TIMEOUT_MS = 60_000

@Injectable()
export class SafetyVideoService {
  /** Old .wmv clips never change — a bounded on-disk cache means we transcode each one once. */
  private readonly inFlight = new Map<string, Promise<string>>()

  async transcode(url: string): Promise<string> {
    if (!NHTSA_VIDEO_URL_PATTERN.test(url)) {
      throw new BadRequestException('Only NHTSA crash-test video URLs can be transcoded')
    }

    const key = createHash('sha256').update(url).digest('hex')
    const outputPath = join(CACHE_DIR, `${key}.mp4`)

    const cached = await this.existingFile(outputPath)
    if (cached) return cached

    const pending = this.inFlight.get(key)
    if (pending) return pending

    const job = this.run(url, key, outputPath).finally(() => this.inFlight.delete(key))
    this.inFlight.set(key, job)
    return job
  }

  private async existingFile(path: string): Promise<string | null> {
    try {
      const info = await stat(path)
      return info.isFile() && info.size > 0 ? path : null
    } catch {
      return null
    }
  }

  private async run(url: string, key: string, outputPath: string): Promise<string> {
    await mkdir(CACHE_DIR, { recursive: true })
    const inputPath = join(CACHE_DIR, `${key}.wmv`)

    try {
      await this.download(url, inputPath)
      await this.runFfmpeg(inputPath, outputPath)
      await this.evictOldest()
      return outputPath
    } finally {
      await rm(inputPath, { force: true })
    }
  }

  private async download(url: string, destination: string): Promise<void> {
    let res: Response
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
    } catch (err) {
      throw new BadGatewayException(`NHTSA video request failed: ${(err as Error).message}`)
    }
    if (!res.ok) throw new BadGatewayException(`NHTSA video request failed: status ${res.status}`)
    await writeFile(destination, Buffer.from(await res.arrayBuffer()))
  }

  private runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
    if (!ffmpegPath) return Promise.reject(new BadGatewayException('ffmpeg is not available on this platform'))

    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, [
        '-y',
        '-i',
        inputPath,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-c:a',
        'aac',
        '-movflags',
        '+faststart',
        '-loglevel',
        'error',
        outputPath
      ])

      const timer = setTimeout(() => {
        proc.kill('SIGKILL')
        reject(new BadGatewayException('ffmpeg transcode timed out'))
      }, FFMPEG_TIMEOUT_MS)

      let stderr = ''
      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })
      proc.on('error', err => {
        clearTimeout(timer)
        reject(new BadGatewayException(`ffmpeg failed to start: ${err.message}`))
      })
      proc.on('close', code => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new BadGatewayException(`ffmpeg exited with code ${code}: ${stderr.slice(0, 500)}`))
      })
    })
  }

  private async evictOldest(): Promise<void> {
    const entries = (await readdir(CACHE_DIR)).filter(f => f.endsWith('.mp4'))
    if (entries.length <= CACHE_MAX_FILES) return

    const withMtime = await Promise.all(
      entries.map(async f => ({ f, mtimeMs: (await stat(join(CACHE_DIR, f))).mtimeMs }))
    )
    withMtime.sort((a, b) => a.mtimeMs - b.mtimeMs)
    const toDelete = withMtime.slice(0, withMtime.length - CACHE_MAX_FILES)
    await Promise.all(toDelete.map(({ f }) => rm(join(CACHE_DIR, f), { force: true })))
  }
}
