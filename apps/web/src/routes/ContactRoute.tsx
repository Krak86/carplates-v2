import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import ContactForm from '@/components/contact/ContactForm'
import Card from '@/components/ui/Card'

const OFFERS = ['web', 'data', 'mobile'] as const

// Lazy-loaded (see App.tsx).
export default function ContactRoute(): ReactNode {
  const { t } = useTranslation()

  return (
    <article className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">{t('contact.heading')}</h1>

      <Card className="space-y-3 text-sm text-[var(--color-fg)]">
        <h2 className="font-semibold">{t('contact.about.heading')}</h2>
        <p>{t('contact.about.p1')}</p>
        <p>
          <Link to="/about" className="text-[var(--color-primary)] underline">
            {t('nav.about')}
          </Link>
          {' · '}
          <Link to="/releases" className="text-[var(--color-primary)] underline">
            {t('nav.releases')}
          </Link>
        </p>
      </Card>

      <Card className="space-y-3 text-sm text-[var(--color-fg)]">
        <h2 className="font-semibold">{t('contact.order.heading')}</h2>
        <p>{t('contact.order.intro')}</p>
        <ul className="list-disc space-y-1.5 pl-5">
          {OFFERS.map(key => (
            <li key={key}>{t(`contact.order.${key}`)}</li>
          ))}
        </ul>
        <p>{t('contact.order.outro')}</p>
      </Card>

      <Card className="space-y-3 text-sm text-[var(--color-fg)]">
        <h2 className="font-semibold">{t('contact.form.heading')}</h2>
        <p className="text-[var(--color-muted)]">{t('contact.form.privacy')}</p>
        <ContactForm />
      </Card>

      <Card className="space-y-2 text-sm text-[var(--color-fg)]">
        <h2 className="font-semibold">{t('contact.discuss.heading')}</h2>
        <p>
          {t('contact.discuss.p1')}{' '}
          <Link to="/discuss" className="text-[var(--color-primary)] underline">
            {t('nav.discuss')}
          </Link>
        </p>
      </Card>
    </article>
  )
}
