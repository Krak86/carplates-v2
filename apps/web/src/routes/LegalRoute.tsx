import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'

export type LegalDoc = 'privacy' | 'terms'

const SECTIONS: Record<LegalDoc, readonly string[]> = {
  privacy: ['registry', 'device', 'account', 'thirdParty', 'rights'],
  terms: ['use', 'data', 'conduct', 'liability', 'changes']
}

/** Sections that end with a link to the About page's data-sources list. */
const SOURCES_LINK_SECTIONS: readonly string[] = ['registry', 'thirdParty', 'data']

type Props = { doc: LegalDoc }

// Lazy-loaded (see App.tsx). One component for both pages: they differ only in copy.
export default function LegalRoute({ doc }: Props): ReactNode {
  const { t } = useTranslation()
  const other: LegalDoc = doc === 'privacy' ? 'terms' : 'privacy'

  return (
    <article className="mx-auto max-w-6xl space-y-4">
      <h1 className="text-2xl font-bold">{t(`legal.${doc}.heading`)}</h1>

      <Card className="space-y-4 text-sm text-[var(--color-fg)]">
        <p className="text-xs text-[var(--color-muted)]">{t('legal.updated')}</p>
        <p>{t(`legal.${doc}.intro`)}</p>

        {SECTIONS[doc].map(id => (
          <section key={id}>
            <h2 className="font-semibold">{t(`legal.${doc}.${id}.h`)}</h2>
            <p className="mt-2">
              {t(`legal.${doc}.${id}.p`)}
              {SOURCES_LINK_SECTIONS.includes(id) && (
                <>
                  {' '}
                  <Link to="/about#sources" className="text-[var(--color-primary)] underline">
                    {t('legal.sourcesLink')}
                  </Link>
                </>
              )}
            </p>
          </section>
        ))}

        <p className="border-t border-[var(--color-border)] pt-4">
          {t('legal.contact')}{' '}
          <Link to="/discuss" className="text-[var(--color-primary)] underline">
            {t('nav.discuss')}
          </Link>
          {' · '}
          <Link to="/contact" className="text-[var(--color-primary)] underline">
            {t('contact.heading')}
          </Link>
          {' · '}
          <Link to={`/${other}`} className="text-[var(--color-primary)] underline">
            {t(`legal.${other}.heading`)}
          </Link>
        </p>
      </Card>
    </article>
  )
}
