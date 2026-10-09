/**
 * Fixed terms for the recall translator: NLLB garbles a few recurring technical words ("airbag" -> "сідма", "merkdealer" ->
 * "торговий дилер"). Before translating, each Dutch term is rewritten as a plain, unambiguous English phrase the model
 * knows in every target language. (Opaque placeholder tokens were tried first: with two or more per sentence NLLB falls
 * into repetition loops.) Compounds keep their prefix: "bestuurdersairbag" -> "bestuurders airbag".
 */
type Term = { nl: RegExp; replacement: string }

const TERMS: Term[] = [
  { nl: /\b(\w*?)(?:veiligheids)?airbags?(\w*)\b/gi, replacement: '$1 safety air cushion $2' },
  { nl: /\bmerk-?dealers?\b/gi, replacement: 'official car dealer' },
  { nl: /\bgasgenerators?\b/gi, replacement: 'gas generator' },
  { nl: /\bremleidingen?\b/gi, replacement: 'brake pipe' },
  { nl: /\bgordelsluitingen?\b/gi, replacement: 'seat belt buckle' },
  { nl: /\bveiligheidsgordels?\b|\bgordels?\b/gi, replacement: 'seat belt' },
  { nl: /\bvoertuigeigenaar(?:s|en)?\b/gi, replacement: 'car owner' }
]

/** Dutch sentence with the glossary terms rewritten. */
export function applyGlossary(sentence: string): string {
  return TERMS.reduce((s, t) => s.replace(t.nl, t.replacement), sentence).replace(/\s+/g, ' ')
}
