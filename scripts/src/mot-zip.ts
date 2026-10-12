import { execFileSync, spawn } from 'node:child_process'
import { Readable } from 'node:stream'

/**
 * The DVSA ZIPs use Deflate64 (2021-23) or are Zip64 (2024-25: > 4 GB, stored), which neither Node's zlib nor the `unzipper`
 * package can read, so the archive is streamed through an external extractor writing to stdout (nothing touches the disk):
 * 7-Zip (reads both), else Info-ZIP `unzip` (Git for Windows ships it; no Zip64), else the bsdtar that comes with Windows 10+
 * (`tar.exe`). The first extractor that can list the archive is used.
 */
type Extractor = { list: (zip: string) => string[]; stream: (zip: string, entry: string) => Readable }

const lines = (out: string): string[] =>
  out
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

const infoZip: Extractor = {
  list: zip => lines(execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8', maxBuffer: 1 << 24 })),
  stream: (zip, entry) => spawn('unzip', ['-p', zip, entry], { stdio: ['ignore', 'pipe', 'inherit'] }).stdout
}

const bsdtar = (): Extractor => {
  const exe = `${process.env.SystemRoot ?? 'C:\\Windows'}\\System32\\tar.exe`
  return {
    list: zip => lines(execFileSync(exe, ['-tf', zip], { encoding: 'utf8', maxBuffer: 1 << 24 })),
    stream: (zip, entry) => spawn(exe, ['-xOf', zip, entry], { stdio: ['ignore', 'pipe', 'inherit'] }).stdout
  }
}

const sevenZip = (exe: string): Extractor => ({
  // `-slt` prints "Path = …" per entry (backslashes on Windows); `-ba` drops the archive header block.
  list: zip =>
    lines(execFileSync(exe, ['l', '-slt', '-ba', zip], { encoding: 'utf8', maxBuffer: 1 << 26 }))
      .filter(l => l.startsWith('Path = '))
      .map(l => l.slice(7)),
  stream: (zip, entry) => spawn(exe, ['e', '-so', zip, entry], { stdio: ['ignore', 'pipe', 'inherit'] }).stdout
})

const SEVEN_ZIP_PATHS = [
  '7z',
  `${process.env.ProgramFiles ?? 'C:\\Program Files'}\\7-Zip\\7z.exe`,
  `${process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)'}\\7-Zip\\7z.exe`
]

const candidates = (): Extractor[] => [...SEVEN_ZIP_PATHS.map(sevenZip), infoZip, bsdtar()]

/** The first extractor that lists the archive's entries; its error text names every failure when none can. */
function extractorFor(zip: string): { x: Extractor; entries: string[] } {
  const errors: string[] = []
  for (const x of candidates()) {
    try {
      const entries = x.list(zip)
      if (entries.length > 0) return { x, entries }
    } catch (e) {
      errors.push(String((e as Error).message).split('\n')[0]!)
    }
  }
  throw new Error(`${zip}: no extractor can read it (install 7-Zip). ${errors.join(' | ')}`)
}

function csvEntries(entries: string[], namePart: string): string[] {
  // The 2022 item ZIP also carries macOS resource forks (`__MACOSX/._test_item.csv`): not data.
  return entries
    .map(n => n.replaceAll('\\', '/'))
    .filter(n => !n.startsWith('__MACOSX/') && !n.split('/').pop()!.startsWith('._'))
    .filter(n => n.toLowerCase().includes(namePart) && n.toLowerCase().endsWith('.csv'))
}

/** Number of data CSV files inside the ZIP (the 2021 pair has twelve parts, 2022-23 one, 2024-25 twelve monthly files). */
export function csvPartCount(zipPath: string, namePart: string): number {
  return csvEntries(extractorFor(zipPath).entries, namePart).length
}

/**
 * The CSV(s) inside a DVSA ZIP whose name contains `namePart`, as one decompressed byte stream. The 2021 ZIPs hold twelve
 * part files and the 2024-25 ones twelve monthly files, each with its own header line (`forEachCsvLine` skips the repeats).
 */
export function openZipCsv(zipPath: string, namePart: string): Readable {
  const { x, entries: all } = extractorFor(zipPath)
  const entries = csvEntries(all, namePart)
  if (entries.length === 0) throw new Error(`${zipPath}: no ${namePart}*.csv inside`)
  if (entries.length === 1) return x.stream(zipPath, entries[0]!)
  return Readable.from(
    (async function* (): AsyncGenerator<Buffer> {
      for (const entry of entries.sort()) {
        for await (const chunk of x.stream(zipPath, entry) as AsyncIterable<Buffer>) yield chunk
        yield Buffer.from('\n')
      }
    })()
  )
}

/** The single entry of a ZIP whose name ends with `suffix` (any type, e.g. NHTSA's `.txt` flat file), as a decompressed byte stream. */
export function openZipEntry(zipPath: string, suffix: string): Readable {
  const { x, entries } = extractorFor(zipPath)
  const entry = entries.find(n => n.toLowerCase().endsWith(suffix.toLowerCase()))
  if (!entry) throw new Error(`${zipPath}: no entry ending in ${suffix}`)
  return x.stream(zipPath, entry)
}

/** Splits one CSV line on commas, honouring double quotes ("" = a quote inside a quoted field). */
export function splitQuoted(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (quoted) {
      if (ch === '\\' && line[i + 1] === '"') {
        // the 2024+ files escape a quote inside a quoted field as \" (`"SERIES 2 88\""`)
        cur += '"'
        i++
      } else if (ch !== '"') cur += ch
      else if (line[i + 1] === '"') {
        cur += '"'
        i++
      } else quoted = false
    } else if (ch === '"') quoted = true
    else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

/**
 * Calls `onLine` for every line of the CSV (pipe- or quoted comma-delimited; header goes to `onHeader` instead). Splits on bytes, so a multi-gigabyte file
 * never sits in memory; returns the number of data lines.
 */
export async function forEachCsvLine(
  stream: Readable,
  onHeader: (header: string[]) => void,
  onLine: (cols: string[]) => void
): Promise<number> {
  let rest: Buffer = Buffer.alloc(0)
  let header: string[] | null = null
  let count = 0

  // The yearly files differ: 2022-23 are pipe-delimited and unquoted, 2021 is comma-delimited with every text field quoted.
  let headerLine = ''
  let split: (line: string) => string[] = l => l.split('|')

  const handle = (line: string): void => {
    if (!line) return
    if (line === headerLine) return
    if (!header) {
      headerLine = line
      if (!line.includes('|')) split = splitQuoted
      header = split(line).map(c => c.trim())
      onHeader(header)
      return
    }
    count++
    onLine(split(line))
  }

  for await (const chunk of stream as AsyncIterable<Buffer>) {
    const buf: Buffer = rest.length ? Buffer.concat([rest, chunk]) : chunk
    let start = 0
    for (;;) {
      const nl = buf.indexOf(10, start)
      if (nl < 0) break
      const end = nl > start && buf[nl - 1] === 13 ? nl - 1 : nl
      handle(buf.toString('utf8', start, end))
      start = nl + 1
    }
    rest = start < buf.length ? Buffer.from(buf.subarray(start)) : Buffer.alloc(0)
  }
  if (rest.length) handle(rest.toString('utf8'))
  return count
}

/** Column index by header name (the layout changes between yearly files, so never positional). */
export function columnIndex(header: readonly string[], names: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const name of names) {
    const i = header.indexOf(name)
    if (i < 0) throw new Error(`column "${name}" missing; header is ${header.join('|')}`)
    out[name] = i
  }
  return out
}
