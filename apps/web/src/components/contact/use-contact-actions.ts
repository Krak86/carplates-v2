import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CONTACT_MESSAGE_MIN } from '@carplates/shared'
import type { ContactTopic } from '@carplates/shared'

import { ApiError, sendContactMessage } from '@/lib/api'
import { useUiStore } from '@/store/ui-store'

export type ContactErrorKind = 'tooMany' | 'challenge' | 'generic'

function errorKind(error: Error | null): ContactErrorKind | null {
  if (!error) return null
  if (error instanceof ApiError && error.status === 429) return 'tooMany'
  if (error instanceof ApiError && error.status === 403) return 'challenge'
  return 'generic'
}

/** State and submit handling of the `/contact` form. */
export function useContactActions() {
  const lang = useUiStore(s => s.lang)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState<ContactTopic>('newApp')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  /** Bumped after every send so the (single-use) Turnstile token is replaced. */
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  const mutation = useMutation({
    mutationFn: sendContactMessage,
    onSuccess: () => setMessage(''),
    onSettled: () => {
      setTurnstileToken(null)
      setTurnstileResetKey(k => k + 1)
    }
  })

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => setName(e.target.value)
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => setEmail(e.target.value)
  const handleTopicChange = (e: ChangeEvent<HTMLSelectElement>): void => setTopic(e.target.value as ContactTopic)
  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>): void => setMessage(e.target.value)
  const handleWebsiteChange = (e: ChangeEvent<HTMLInputElement>): void => setWebsite(e.target.value)

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    mutation.mutate({
      name: name || undefined,
      email,
      topic,
      message,
      lang,
      website: website || undefined,
      turnstileToken: turnstileToken ?? undefined
    })
  }

  return {
    name,
    email,
    topic,
    message,
    website,
    setTurnstileToken,
    turnstileResetKey,
    sent: mutation.isSuccess,
    pending: mutation.isPending,
    error: errorKind(mutation.error),
    canSubmit: message.trim().length >= CONTACT_MESSAGE_MIN && !!email && !mutation.isPending,
    handleNameChange,
    handleEmailChange,
    handleTopicChange,
    handleMessageChange,
    handleWebsiteChange,
    handleSubmit
  }
}
