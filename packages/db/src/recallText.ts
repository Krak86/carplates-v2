import { createHash } from 'node:crypto'

/** Key of a Dutch recall text in `registry.rdw_recall_texts`: sha256 of the whitespace-collapsed text. */
export function recallTextHash(text: string): string {
  return createHash('sha256').update(text.replace(/\s+/g, ' ').trim()).digest('hex')
}
