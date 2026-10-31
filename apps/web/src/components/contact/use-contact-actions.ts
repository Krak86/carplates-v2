import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { CONTACT_MAX_LINKS, CONTACT_MESSAGE_MIN, EMAIL_CODE_LENGTH, countLinks } from '@carplates/shared'
import type { ContactTopic, EmailStartResponse } from '@carplates/shared'

import { ApiError, sendContactMessage, startContactCode } from '@/lib/api'
import { sessionQuery } from '@/lib/queries'
import { useUiStore } from '@/store/ui-store'

export type ContactErrorKind = 'tooMany' | 'challenge' | 'badCode' | 'generic'

function errorKind(error: Error | null): ContactErrorKind | null {
  if (!error) return null
  if (error instanceof ApiError && error.status === 429) return 'tooMany'
  if (error instanceof ApiError && error.status === 403) return 'challenge'
  if (error instanceof ApiError && error.status === 401) return 'badCode'
  return 'generic'
}

/**
 * State and submit handling of the `/contact` form. A signed-in user (with an email) sends in one step; an anonymous
 * sender passes the bot check, gets a code mailed to the address, and sends with it.
 */
export function useContactActions(turnstileSiteKey: string | null) {
  const lang = useUiStore(s => s.lang)
  const accountEmail = useQuery(sessionQuery()).data?.user?.email ?? null
  const [typedEmail, setTypedEmail] = useState('')
  const [name, setName] = useState('')
  const [topic, setTopic] = useState<ContactTopic>('newApp')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState<EmailStartResponse | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  /** Bumped after every code request so the (single-use) Turnstile token is replaced. */
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  const signedIn = !!accountEmail
  const email = accountEmail ?? typedEmail

  const startMutation = useMutation({
    mutationFn: startContactCode,
    onSuccess: response => {
      setChallenge(response)
      setCode('')
    },
    onSettled: () => {
      setTurnstileToken(null)
      setTurnstileResetKey(k => k + 1)
    }
  })

  const sendMutation = useMutation({
    mutationFn: sendContactMessage,
    onSuccess: () => {
      setMessage('')
      setChallenge(null)
      setCode('')
    },
    // The code is single-use: after a delivery failure the sender needs a new one (a wrong code, 401, can be retyped).
    onError: error => {
      if (error instanceof ApiError && error.status < 500) return
      setChallenge(null)
      setCode('')
    }
  })

  const needsCode = !signedIn && !!challenge
  const tooManyLinks = countLinks(message) > CONTACT_MAX_LINKS
  const detailsOk = message.trim().length >= CONTACT_MESSAGE_MIN && !tooManyLinks && !!email
  const botCheckOk = signedIn || !!challenge || !turnstileSiteKey || !!turnstileToken
  const codeOk = !needsCode || code.length === EMAIL_CODE_LENGTH
  const pending = startMutation.isPending || sendMutation.isPending

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>): void => setName(e.target.value)
  const handleTopicChange = (e: ChangeEvent<HTMLSelectElement>): void => setTopic(e.target.value as ContactTopic)
  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>): void => setMessage(e.target.value)
  const handleWebsiteChange = (e: ChangeEvent<HTMLInputElement>): void => setWebsite(e.target.value)
  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>): void =>
    setCode(e.target.value.replace(/\D/g, '').slice(0, EMAIL_CODE_LENGTH))

  /** A code belongs to one address: editing it starts over. */
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setTypedEmail(e.target.value)
    setChallenge(null)
    setCode('')
  }

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    startMutation.reset()
    sendMutation.reset()
    const fields = { name: name || undefined, email, topic, message, lang, website: website || undefined }

    if (signedIn) {
      sendMutation.mutate(fields)
    } else if (challenge) {
      sendMutation.mutate({ ...fields, challengeId: challenge.challengeId, code })
    } else {
      startMutation.mutate({ email, lang, website: website || undefined, turnstileToken: turnstileToken ?? undefined })
    }
  }

  return {
    name,
    email,
    topic,
    message,
    website,
    code,
    signedIn,
    needsCode,
    tooManyLinks,
    setTurnstileToken,
    turnstileResetKey,
    sent: sendMutation.isSuccess,
    pending,
    error: errorKind(sendMutation.error ?? startMutation.error),
    canSubmit: detailsOk && botCheckOk && codeOk && !pending,
    handleNameChange,
    handleEmailChange,
    handleTopicChange,
    handleMessageChange,
    handleWebsiteChange,
    handleCodeChange,
    handleSubmit
  }
}
