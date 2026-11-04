import type { AuctionProceedingInsert } from '@carplates/db'

/**
 * One line of the Unified Register of Debtors CSV (Ministry of Justice, data.gov.ua `506734bf-…`), already decoded from windows-1251.
 * Columns: DEBTOR_NAME, DEBTOR_BIRTHDATE, DEBTOR_CODE, PUBLISHER, ORG_NAME, ORG_PHONE_NUM, EMP_FULL_FIO, EMP_PHONE_NUM, EMAIL_ADDR,
 * VP_ORDERNUM, VD_CAT. Only PUBLISHER (the body that issued the writ), ORG_NAME (bailiff office), VP_ORDERNUM and VD_CAT are read:
 * the debtor's name, birth date and tax id, and the bailiff's name and contacts are personal data and never leave this function.
 */
const COLUMNS = 11
const MAX_LEN = 300

/** Splits one comma-separated line with `"`-quoted fields (`""` = a quote inside a field); null when it does not have all columns. */
export function splitDebtorLine(line: string): string[] | null {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (quoted) {
      if (ch !== '"') cur += ch
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
  return out.length === COLUMNS ? out : null
}

const clean = (v: string | undefined): string | null => {
  const t = v?.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN)
  return t ? t : null
}

/** The proceeding number at the end of a raw line (`…,"71795326","category"`), or null. Cheap enough to run on 11 million lines. */
export function proceedingOfLine(raw: string): string | null {
  const m = /,"(\d{5,12})","(?:[^"]|"")*"\s*$/.exec(raw)
  return m ? m[1]! : null
}

/** A decoded register line as a `registry.auction_proceedings` row; null for a malformed line or one without a proceeding number. */
export function toProceedingInsert(decodedLine: string): AuctionProceedingInsert | null {
  const c = splitDebtorLine(decodedLine)
  const proceedingNo = c ? /^\d{5,12}$/.exec((c[9] ?? '').trim())?.[0] : null
  if (!c || !proceedingNo) return null
  return { proceedingNo, category: clean(c[10]), issuer: clean(c[3]), bailiffOffice: clean(c[4]) }
}
