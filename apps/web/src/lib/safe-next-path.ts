/** A post-sign-in destination from a link: only same-origin relative paths (`/x`), never `//host` or a backslash variant. */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  // Control characters (newlines, tabs) are stripped by URL parsers, which can turn "/\t/evil" into "//evil".
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(raw)) return fallback
  return raw
}
