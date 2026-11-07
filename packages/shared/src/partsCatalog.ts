/**
 * Parts-catalog link-out (RealOEM, BMW). Outbound link only: nothing is fetched or copied (RealOEM answers 403 to
 * automated clients, and the page is theirs). Their search form takes the last 7 characters of the VIN; the same
 * serial in `?vin=` opens the identified car (checked by hand in a browser on 2026-11-07).
 *
 * BMW WMIs only: MINI (`WMW`) and Rolls-Royce are not covered here until their catalog URL is verified.
 */

const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/

/** WMI prefixes RealOEM's BMW catalog serves: BMW, BMW M, BMW i, and the US-built (Spartanburg) plants. */
const BMW_CATALOG_WMIS: ReadonlySet<string> = new Set(['WBA', 'WBS', 'WBY', '4US', '5UX', '5UM', '5YM'])

/** The catalog's serial number: the last 7 VIN characters. */
export function bmwSerial(vin: string): string {
  return vin.slice(-7)
}

/** RealOEM link for a BMW VIN (spaces and case tolerated), or `null` for any other make or a malformed VIN. */
export function realoemUrl(vin: string | null | undefined): string | null {
  const v = vin?.replace(/\s+/g, '').toUpperCase()
  if (!v || !VIN_RE.test(v) || !BMW_CATALOG_WMIS.has(v.slice(0, 3))) return null
  return `https://www.realoem.com/bmw/enUS/select?vin=${bmwSerial(v)}`
}
