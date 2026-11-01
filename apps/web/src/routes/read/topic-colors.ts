import type { CSSProperties } from 'react'

import { ARTICLES } from '@/routes/read/articles'
import { articleTopics } from '@/routes/read/helpers'

// Topic chips cycle the ten `--label-N` hues of global.css.
const LABEL_COLOR_COUNT = 10

const TOPIC_ORDER = articleTopics(ARTICLES).map(tag => tag.en)

/** Sets `--chip` to the topic's color, so the hub filter and the article cards agree. Pair with `text-(--chip)` etc. */
export function topicChipStyle(tagEn: string): CSSProperties {
  const index = Math.max(0, TOPIC_ORDER.indexOf(tagEn))
  return { '--chip': `var(--label-${index % LABEL_COLOR_COUNT})` } as CSSProperties
}
