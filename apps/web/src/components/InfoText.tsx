import type { ReactNode } from 'react'

type Props = {
  text: string
}

const ITEM_SEPARATOR = ' — '

/**
 * Renders an i18n explanation written as `lead\nname — description\nname — description`: the first line is a
 * paragraph, every further line a bullet whose part before " — " is bold. Single-line texts stay one paragraph.
 */
export default function InfoText({ text }: Props): ReactNode {
  const [lead, ...items] = text.split('\n')

  return (
    <>
      <p>{lead}</p>

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
                    {rest.join(ITEM_SEPARATOR)}
                  </>
                ) : (
                  item
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
