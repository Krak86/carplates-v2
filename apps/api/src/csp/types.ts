import { z } from 'zod'

const str = z.string().max(2048)
const int = z.number().int().nonnegative()

/** Legacy `report-uri` body (`application/csp-report`): `{ "csp-report": { kebab-case fields } }`. */
export const legacyCspReportSchema = z.object({
  'csp-report': z.object({
    'document-uri': str.optional(),
    'blocked-uri': str.optional(),
    'effective-directive': str.optional(),
    'violated-directive': str.optional(),
    disposition: str.optional(),
    'source-file': str.optional(),
    'line-number': int.optional(),
    'column-number': int.optional(),
    'script-sample': str.optional()
  })
})

/** Reporting API `body` of a `csp-violation` report (`application/reports+json`): camelCase fields. */
export const cspViolationBodySchema = z.object({
  documentURL: str.optional(),
  blockedURL: str.optional(),
  effectiveDirective: str.optional(),
  disposition: str.optional(),
  sourceFile: str.optional(),
  lineNumber: int.nullish(),
  columnNumber: int.nullish(),
  sample: str.optional()
})

/** Reporting API envelope: a batch of reports of any type; only `csp-violation` ones are used. */
export const reportingApiSchema = z.array(z.object({ type: z.string().max(64), body: z.unknown().optional() })).max(50)

/** Either wire format; anything else is a 400. */
export const cspReportRequestSchema = z.union([legacyCspReportSchema, reportingApiSchema])

export type CspReportRequest = z.infer<typeof cspReportRequestSchema>

/** One violation, whatever the wire format. */
export type CspViolation = {
  documentUrl: string
  blockedUrl: string
  directive: string
  disposition: string
  sourceFile: string
  line: number | null
  column: number | null
  sample: string
}
