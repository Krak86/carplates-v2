import type { ReactNode } from 'react'

type Props = {
  text: string
  /** Names (a car make + model, an alias) to emphasise wherever they appear, so they stand out from the sentence. */
  highlight?: readonly string[]
}

const ITEM_SEPARATOR = ' — '
const NAME_CLASS = 'font-semibold underline decoration-[var(--color-primary)] decoration-2 underline-offset-2'

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** `line` with every occurrence of a highlighted name wrapped in an underlined, bold span. */
function markNames(line: string, names: readonly string[]): ReactNode {
  if (names.length === 0) return line
  const pattern = new RegExp(`(${names.map(escapeRegExp).join('|')})`)
  return line.split(pattern).map((part, i) =>
    names.includes(part) ? (
      <strong key={i} className={NAME_CLASS}>
        {part}
      </strong>
    ) : (
      part
    )
  )
}

/**
 * Renders an i18n explanation written as `lead\nname — description\nname — description`: the first line is a
 * paragraph, every further line a bullet whose part before " — " is bold. Single-line texts stay one paragraph.
 * `highlight` names are bold and underlined wherever they occur.
 */
export default function InfoText({ text, highlight = [] }: Props): ReactNode {
  const [lead, ...items] = text.split('\n')
  const names = highlight.filter(Boolean)

  return (
    <>
      <p>{markNames(lead ?? '', names)}</p>

      {items.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
          {items.map(item => {
            const [name, ...rest] = item.split(ITEM_SEPARATOR)
            return (
              <li key={item}>
                {rest.length > 0 ? (
                  <>
                    <strong className="font-semibold">{name}</strong>
                    {ITEM_SEPARATOR}
                    {markNames(rest.join(ITEM_SEPARATOR), names)}
                  </>
                ) : (
                  markNames(item, names)
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
