import { useCallback, useEffect, useRef, useState } from 'react'

import { detectOptions, translateLocally, type LocalOption, type TranslatorId } from '@/lib/local-translate'

type Running = { id: TranslatorId; percent: number | null }

/**
 * State of the translate dialog: asks the browser what it can do on-device for `from` → `to` (nothing is downloaded by
 * that), then runs the engine the reader picked — the pick is the consent to any download. When the built-in browser
 * translator is already installed it runs at once (nothing to download, like opening Google Translate).
 */
export function useTranslateDialogActions(text: string, from: string, to: string) {
  const [options, setOptions] = useState<LocalOption[] | null>(null)
  const [running, setRunning] = useState<Running | null>(null)
  const [result, setResult] = useState<{ id: TranslatorId; text: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const autoRan = useRef(false)

  useEffect(() => {
    let cancelled = false
    void detectOptions(from, to).then(found => {
      if (!cancelled) setOptions(found)
    })
    return (): void => {
      cancelled = true
    }
  }, [from, to])

  const handleTranslate = useCallback(
    async (id: TranslatorId): Promise<void> => {
      setFailed(false)
      setResult(null)
      setRunning({ id, percent: null })
      try {
        setResult({ id, text: await translateLocally(id, text, from, to, percent => setRunning({ id, percent })) })
        // The download is done: re-read the options so the size notice turns into "ready".
        setOptions(await detectOptions(from, to))
      } catch {
        setFailed(true)
      } finally {
        setRunning(null)
      }
    },
    [text, from, to]
  )

  useEffect(() => {
    const first = options?.[0]
    if (autoRan.current || first?.id !== 'chrome' || first.status !== 'ready') return
    autoRan.current = true
    void handleTranslate('chrome')
  }, [options, handleTranslate])

  return { options, running, result, failed, handleTranslate }
}
