import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { CONTACT_COOLDOWN_MINUTES, CONTACT_MAX_LINKS, CONTACT_MESSAGE_MAX, CONTACT_TOPICS } from '@carplates/shared'

import TurnstileSlot from '@/components/auth/TurnstileSlot'
import { useContactActions } from '@/components/contact/use-contact-actions'
import { contactConfigQuery } from '@/lib/queries'

const INPUT_CLASS =
  'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]'
const LABEL_CLASS = 'mb-1 block text-xs font-medium text-[var(--color-muted)]'

/** Contact form: the API mails the message to the owner's private inbox, so no address is shown here. */
export default function ContactForm(): ReactNode {
  const { t } = useTranslation()
  const config = useQuery(contactConfigQuery())
  const form = useContactActions(config.data?.turnstileSiteKey ?? null)

  const submitKey = form.signedIn
    ? 'contact.form.submit'
    : form.needsCode
      ? 'contact.form.submitCode'
      : 'contact.form.getCode'

  if (config.isPending) return null

  if (config.data?.enabled !== true) {
    return <p className="text-sm text-[var(--color-muted)]">{t('contact.form.disabled')}</p>
  }

  if (form.sent) {
    return (
      <p role="status" className="text-sm">
        {t('contact.form.sent')}
      </p>
    )
  }

  return (
    <form onSubmit={form.handleSubmit} className="max-w-xl space-y-3">
      <div>
        <label className={LABEL_CLASS} htmlFor="contact-name">
          {t('contact.form.name')}
        </label>
        <input
          id="contact-name"
          value={form.name}
          onChange={form.handleNameChange}
          maxLength={100}
          autoComplete="name"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="contact-email">
          {t('contact.form.email')}
        </label>
        <input
          id="contact-email"
          type="email"
          required
          value={form.email}
          onChange={form.handleEmailChange}
          readOnly={form.signedIn}
          maxLength={254}
          autoComplete="email"
          className={INPUT_CLASS}
        />
        {form.signedIn && <p className="mt-1 text-xs text-[var(--color-muted)]">{t('contact.form.accountEmail')}</p>}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="contact-topic">
          {t('contact.form.topic')}
        </label>
        <select id="contact-topic" value={form.topic} onChange={form.handleTopicChange} className={INPUT_CLASS}>
          {CONTACT_TOPICS.map(topic => (
            <option key={topic} value={topic}>
              {t(`contact.topic.${topic}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="contact-message">
          {t('contact.form.message')}
        </label>
        <textarea
          id="contact-message"
          required
          rows={6}
          value={form.message}
          onChange={form.handleMessageChange}
          maxLength={CONTACT_MESSAGE_MAX}
          className={INPUT_CLASS}
        />
        {form.tooManyLinks && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {t('contact.form.tooManyLinks', { max: CONTACT_MAX_LINKS })}
          </p>
        )}
      </div>

      {/* Honeypot: invisible and unreachable for people, tempting for form-filling bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={form.handleWebsiteChange}
        />
      </div>

      {form.needsCode && (
        <div>
          <label className={LABEL_CLASS} htmlFor="contact-code">
            {t('contact.form.code', { email: form.email })}
          </label>
          <input
            id="contact-code"
            value={form.code}
            onChange={form.handleCodeChange}
            inputMode="numeric"
            autoComplete="one-time-code"
            className={INPUT_CLASS}
          />
        </div>
      )}

      {!form.signedIn && !form.needsCode && config.data.turnstileSiteKey && (
        <TurnstileSlot
          siteKey={config.data.turnstileSiteKey}
          resetKey={form.turnstileResetKey}
          onToken={form.setTurnstileToken}
        />
      )}

      {form.error && (
        <p role="alert" className="text-sm text-red-600">
          {t(`contact.form.error.${form.error}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={!form.canSubmit}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary-fg)] disabled:opacity-50"
      >
        {t(submitKey)}
      </button>

      <p className="text-xs text-[var(--color-muted)]">
        {t('contact.form.cooldown', { minutes: CONTACT_COOLDOWN_MINUTES })}
      </p>
    </form>
  )
}
