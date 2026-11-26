/**
 * Partial masking of personal data in log text (admin Logs tab, `docs/logs-plan.md`). Single source of truth for
 * TypeScript; `infra/vector.yaml` mirrors it in VRL and both run the same fixture (`__fixtures__/log-lines.txt`).
 *
 * Passes run in this order and every one is idempotent (`redactLogText(redactLogText(x)) === redactLogText(x)`),
 * because the API logger masks first and Vector and the logs service mask again:
 * secrets, share-token paths, plate / VIN URL segments, sensitive query params, emails, IPv6, IPv4, VINs, plates.
 */
import { isShortSeriesPlate, isSovietPlate, isUaPlate, isVin } from './plate.js'

const REDACTED = '[redacted]'

const stars = (count: number): string => '*'.repeat(Math.max(count, 0))

/** `AA1234BB` → `AA****BB`: the first and the last two characters stay (any 8-char shape). */
export function maskPlate(plate: string): string {
  const compact = plate.replace(/\s+/g, '')
  return compact.length <= 4
    ? stars(compact.length)
    : `${compact.slice(0, 2)}${stars(compact.length - 4)}${compact.slice(-2)}`
}

/** `WVWZZZ1JZXW000001` → `WVW**********0001`: the WMI (3) and the last 4 stay. */
export function maskVin(vin: string): string {
  const compact = vin.replace(/\s+/g, '')
  return compact.length <= 7
    ? stars(compact.length)
    : `${compact.slice(0, 3)}${stars(compact.length - 7)}${compact.slice(-4)}`
}

/** `roman@gmail.com` → `r***@g***.com` (the domain keeps its first letter and its last label). */
export function maskEmail(local: string, domain: string): string {
  const labels = domain.split('.')
  const tld = labels.length > 1 ? (labels.at(-1) ?? '') : ''
  return `${local.slice(0, 1)}***@${domain.slice(0, 1)}***${tld ? `.${tld}` : ''}`
}

/** IPv4: the last octet becomes `0`; `null` when the text is not a dotted quad. */
export function maskIpv4(ip: string): string | null {
  const octets = ip.split('.')
  if (octets.length !== 4 || octets.some(o => !/^\d{1,3}$/.test(o) || Number(o) > 255)) return null
  return `${octets[0]}.${octets[1]}.${octets[2]}.0`
}

/** IPv6: only the /48 (first three groups) stays, `2001:db8:85a3::`; `null` when the text is not a valid address. */
export function maskIpv6(ip: string): string | null {
  const halves = ip.toLowerCase().split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves[1] ? halves[1].split(':') : []
  const groups = [...head, ...tail]
  if (groups.some(g => !/^[0-9a-f]{1,4}$/.test(g))) return null
  if (halves.length === 1 ? groups.length !== 8 : groups.length > 7) return null
  const full = halves.length === 1 ? groups : [...head, ...Array<string>(8 - groups.length).fill('0'), ...tail]
  const kept = full.slice(0, 3).map(g => g.replace(/^0+(?=.)/, ''))
  return `${kept.join(':')}::`
}

/** A plate-or-VIN looking URL segment (percent-decoded when possible), masked; `null` when it is neither. */
function maskIdentifier(raw: string): string | null {
  let text = raw
  try {
    text = decodeURIComponent(raw)
  } catch {
    // keep the raw text: a malformed escape is still masked below when it looks like an identifier
  }
  if (isVin(text)) return maskVin(text)
  if (isUaPlate(text) || isSovietPlate(text) || isShortSeriesPlate(text)) return maskPlate(text)
  return null
}

/** Mask for a URL segment or query value that is meant to hold a plate / VIN, whatever its shape. */
function maskAnyIdentifier(raw: string): string {
  return (
    maskIdentifier(raw) ??
    (raw.length <= 4 ? stars(raw.length) : `${raw.slice(0, 2)}${stars(raw.length - 4)}${raw.slice(-2)}`)
  )
}

const LETTER = String.raw`\p{L}`

const SECRET_HEADER_RE = /\b(authorization|set-cookie|cookie)(["']?\s*[:=]\s*["']?)[^\r\n"'}]*/gi
const SECRET_PARAM_RE =
  /(^|[?&;\s"'])((?:access_|refresh_|id_)?token|code|password|secret|api_?key|sig|signature)=[^&\s"'#]*/gi
const SHARE_PATH_RE = /(\/api\/shares\/)[\w-]{20,}/g
/** Routes whose first segment is a plate or a VIN. A segment must hold a digit (the `history` in `/plate/AA1234BB/history` has none). */
const ID_PATH_RE = /(\/(?:api\/(?:plate|vin|card|ria-check)|og)\/)([^/?#\s"'\\]*\d[^/?#\s"'\\]*)/g
const ID_PARAM_RE = /(^|[?&;\s"'])((?:plate|vin|q|query)=)([^&\s"'#]+)/gi
/** `GET /АХ22925 200`: a one-segment SPA path, masked only when the segment really is a plate or a VIN. */
const BARE_PATH_RE = /(?<=^|[\s"'])\/([^/?#\s"'\\]*\d[^/?#\s"'\\]*)(?=[?#\s"'\\]|$)/g
const EMAIL_RE = /(?<![\w.%+-])([\w.%+-]+)@([A-Za-z0-9-][A-Za-z0-9.-]*\.[A-Za-z]{2,})(?![\w-])/g
const IPV6_RE = new RegExp(
  String.raw`(?<![\w:.])(?:(?:[0-9a-f]{1,4}:){7}[0-9a-f]{1,4}|(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{0,4}::(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{0,4})(?![\w:.])`,
  'gi'
)
const IPV4_RE = /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d]|\.\d)/g
const VIN_TEXT_RE = /(?<![A-Za-z0-9])[A-HJ-NPR-Z0-9]{17}(?![A-Za-z0-9])/gi
/** Candidates (8 chars, or `AA 1234 BB`); `isUaPlate` decides, so Latin / Cyrillic look-alikes behave as in `normalizePlate`. */
const PLATE_TEXT_RE = new RegExp(
  String.raw`(?<![${LETTER}\d])[${LETTER}\d]{2}(?: ?[${LETTER}\d]{4} ?[${LETTER}\d]{2})(?![${LETTER}\d])`,
  'gu'
)

/** Replaces every personal-data shape in `text` with its partial mask (see the module comment for the order). */
export function redactLogText(text: string): string {
  return text
    .replace(SECRET_HEADER_RE, (_m, name: string, sep: string) => `${name}${sep}${REDACTED}`)
    .replace(SECRET_PARAM_RE, (_m, lead: string, name: string) => `${lead}${name}=${REDACTED}`)
    .replace(SHARE_PATH_RE, `$1${REDACTED}`)
    .replace(ID_PATH_RE, (m, lead: string, segment: string) =>
      segment.includes('*') ? m : `${lead}${maskAnyIdentifier(segment)}`
    )
    .replace(ID_PARAM_RE, (m, lead: string, name: string, value: string) =>
      value.includes('*') ? m : `${lead}${name}${maskAnyIdentifier(value)}`
    )
    .replace(BARE_PATH_RE, (match, segment: string) => {
      const masked = maskIdentifier(segment)
      return masked ? `/${masked}` : match
    })
    .replace(EMAIL_RE, (_m, local: string, domain: string) => maskEmail(local, domain))
    .replace(IPV6_RE, match => maskIpv6(match) ?? match)
    .replace(IPV4_RE, match => maskIpv4(match) ?? match)
    .replace(VIN_TEXT_RE, match => (/\d/.test(match) && /[A-Za-z]/.test(match) ? maskVin(match) : match))
    .replace(PLATE_TEXT_RE, match => (isUaPlate(match) ? maskPlate(match) : match))
}

/** Plain-object / array / Error aware variant for logger arguments; strings go through `redactLogText`, others keep their shape. */
export function redactLogValue(value: unknown): unknown {
  if (typeof value === 'string') return redactLogText(value)
  if (value instanceof Error) return redactLogText(value.stack ?? `${value.name}: ${value.message}`)
  if (value === null || typeof value !== 'object') return value
  try {
    return JSON.parse(redactLogText(JSON.stringify(value))) as unknown
  } catch {
    // circular or non-serializable: keep the text form rather than leak the raw object
    return redactLogText(String(value))
  }
}
