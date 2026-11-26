import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const RELEASES_DIR = new URL('../../packages/shared/src/releases/', import.meta.url)

/**
 * Date of the newest release day, read from the source of the newest month file (newest day at its top), so the web
 * bundle needs no hand-bumped copy and no import of the release chunks. Injected as `__LATEST_RELEASE_DATE__`.
 * `latest.test.ts` checks it against `RELEASES`, so a drifting regex fails a test instead of the bell.
 */
export function latestReleaseDate(): string {
  const core = readFileSync(fileURLToPath(new URL('core.ts', RELEASES_DIR)), 'utf8')
  const months = /RELEASE_MONTHS\s*=\s*\[\s*'(\d{4}-\d{2})'/.exec(core)?.[1]
  if (!months) throw new Error('latestReleaseDate: cannot read RELEASE_MONTHS from releases/core.ts')
  const month = readFileSync(fileURLToPath(new URL(`${months}.ts`, RELEASES_DIR)), 'utf8')
  const date = /date:\s*'(\d{4}-\d{2}-\d{2})'/.exec(month)?.[1]
  if (!date) throw new Error(`latestReleaseDate: no day found in releases/${months}.ts`)
  return date
}
