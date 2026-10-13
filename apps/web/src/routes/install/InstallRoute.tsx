import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { INSTALL_SECTIONS, INSTALL_STEPS } from '@/routes/install/helpers'
import { useInstallActions } from '@/routes/install/use-install-actions'

// Lazy-loaded (see App.tsx). Static copy plus one live block: the install button for this browser.
export default function InstallRoute(): ReactNode {
  const { t } = useTranslation()
  const { canInstall, installed, ios, handleInstall } = useInstallActions()

  return (
    <article className="mx-auto max-w-content space-y-4">
      <h1 className="text-2xl font-bold">{t('install.heading')}</h1>

      <Card className="space-y-3 text-sm">
        {installed && <p className="font-semibold text-[var(--color-primary)]">{t('install.alreadyInstalled')}</p>}

        {!installed && canInstall && (
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 font-semibold text-white"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
            </svg>
            {t('install.button')}
          </button>
        )}

        {!installed && !canInstall && (
          <p className="text-[var(--color-muted)]">{t(ios ? 'install.iosHint' : 'install.noPrompt')}</p>
        )}

        <p>{t('install.intro')}</p>

        <ul className="list-disc space-y-1 pl-5">
          {INSTALL_STEPS.map(step => (
            <li key={step}>{t(`install.step.${step}`)}</li>
          ))}
        </ul>
      </Card>

      {INSTALL_SECTIONS.map(({ id, items }) => (
        <Card key={id} id={id} className="space-y-2 text-sm">
          <h2 className="text-base font-semibold">{t(`install.${id}.h`)}</h2>

          <ul className="list-disc space-y-1 pl-5">
            {Array.from({ length: items }, (_, i) => (
              <li key={i}>{t(`install.${id}.${i + 1}`)}</li>
            ))}
          </ul>
        </Card>
      ))}

      <p className="text-xs text-[var(--color-muted)]">
        <Link to="/about" className="text-[var(--color-primary)] underline">
          {t('nav.about')}
        </Link>
        {' · '}
        <Link to="/privacy" className="text-[var(--color-primary)] underline">
          {t('legal.privacy.heading')}
        </Link>
      </p>
    </article>
  )
}
