import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SHARE_ALIASES, type ShareAlias } from '@carplates/shared'

import Card from '@/components/ui/Card'
import { LANGS, type Lang } from '@/i18n'
import { cn } from '@/lib/cn'
import { aliasCardPath } from '@/routes/share/share-links'
import { useShareActions } from '@/routes/share/use-share-actions'

const ALIAS_ICON: Record<ShareAlias, string> = {
  plate: '🔎',
  vin: '🔢',
  'plate-photo': '📷',
  'vin-photo': '🔖',
  ar: '🔍',
  login: '🔑',
  signup: '✨'
}

const LANG_LABEL: Record<Lang, string> = { ua: 'UA', ru: 'RU', en: 'EN' }

// Lazy-loaded (see App.tsx). Public: every link here is a `/go/<alias>` page with its own link preview.
export default function ShareRoute(): ReactNode {
  const { t } = useTranslation()
  const { lang, setLang, src, setSrc, copiedAlias, urlOf, copy } = useShareActions()

  return (
    <div className="mx-auto w-full max-w-6xl">
      <Card className="mb-4">
        <h1 className="mb-2 text-2xl font-bold">{t('share.title')}</h1>
        <p className="text-[var(--color-muted)]">{t('share.intro')}</p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div role="group" aria-label={t('share.language')} className="flex flex-col gap-1">
            <span className="text-sm text-[var(--color-muted)]">{t('share.language')}</span>
            <div className="flex gap-1.5">
              {LANGS.map(l => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={l === lang}
                  onClick={() => setLang(l)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                    l === lang
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg)] hover:border-[var(--color-muted)]'
                  )}
                >
                  {LANG_LABEL[l]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex min-w-48 flex-1 flex-col gap-1 sm:max-w-xs">
            <span className="text-sm text-[var(--color-muted)]">{t('share.source')}</span>
            <input
              value={src}
              onChange={e => setSrc(e.target.value)}
              maxLength={32}
              placeholder="telegram"
              autoComplete="off"
              spellCheck={false}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 outline-none focus:border-[var(--color-primary)]"
            />
          </label>
        </div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{t('share.sourceHint')}</p>
      </Card>

      <ul className="grid gap-4 md:grid-cols-2">
        {SHARE_ALIASES.map(alias => {
          const url = urlOf(alias)
          const isCopied = copiedAlias === alias
          return (
            <li key={alias}>
              <Card className="flex h-full flex-col gap-3">
                <img
                  src={aliasCardPath(alias, lang)}
                  alt=""
                  width={1200}
                  height={630}
                  loading="lazy"
                  onError={e => {
                    e.currentTarget.hidden = true
                  }}
                  className="aspect-[1200/630] w-full rounded-lg border border-[var(--color-border)] object-cover"
                />

                <div className="min-w-0">
                  <h2 className="font-semibold">
                    <span aria-hidden>{ALIAS_ICON[alias]}</span> {t(`share.alias.${alias}`)}
                  </h2>
                  <p className="text-sm text-[var(--color-muted)]">{t(`share.alias.${alias}.desc`)}</p>
                </div>

                <input
                  readOnly
                  value={url}
                  aria-label={t(`share.alias.${alias}`)}
                  onFocus={e => e.currentTarget.select()}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 font-mono text-sm"
                />

                <div className="mt-auto flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void copy(alias)}
                    className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 font-medium text-[var(--color-primary-fg)] hover:opacity-90"
                  >
                    {isCopied ? t('share.copied') : t('share.copy')}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {t('share.open')}
                  </a>
                  <span role="status" className="sr-only">
                    {isCopied ? t('share.copied') : ''}
                  </span>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
