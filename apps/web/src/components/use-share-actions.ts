import { buildShareUrl } from '@/lib/share-section'
import type { ShareSection } from '@/lib/share-section'
import { useCopyFeedback } from '@/components/use-copy-feedback'

type UseShareActions = {
  copied: boolean
  share: () => void
}

export function useShareActions(section: ShareSection, tab?: string): UseShareActions {
  const { copied, copy } = useCopyFeedback()
  const share = (): void => copy(buildShareUrl(section, tab))
  return { copied, share }
}
