import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import Card from '@/components/ui/Card'
import { CELL_ICON, OUR_EDGE, OUR_GAPS, ROWS, SERVICE_PRICE_ICON, SERVICE_URL } from '@/routes/alternatives/helpers'
import { CELLS, SERVICES } from '@/routes/alternatives/types'

// Lazy-loaded (see App.tsx). Public, no sign-in.
export default function AlternativesRoute(): ReactNode {
  const { t } = useTranslation()

  return (
    <div className="mx-auto w-full max-w-[96rem]">
      {/* Opaque panels: the page sits over a user-chosen photo/live background. */}
      <Card className="mb-4">
        <h1 className="mb-2 text-2xl font-bold">{t('alt.title')}</h1>
        <p className="text-[var(--color-muted)]">{t('alt.intro')}</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {CELLS.map(c => (
            <li key={c}>
              <span aria-hidden>{CELL_ICON[c]}</span> {t(`alt.legend.${c}`)}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-x-auto p-0 md:p-0">
        <table className="w-full min-w-[70rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] align-bottom">
              <th scope="col" className="sticky left-0 bg-[var(--color-surface)] p-3 font-semibold">
                {t('alt.col.feature')}
              </th>
              {SERVICES.map(s => {
                const url = SERVICE_URL[s]
                return (
                  <th key={s} scope="col" className="min-w-32 p-3 align-bottom">
                    <span className="block font-semibold">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--color-primary)] hover:underline"
                        >
                          {t(`alt.service.${s}`)}
                        </a>
                      ) : (
                        t(`alt.service.${s}`)
                      )}
                    </span>
                    <span className="block text-xs font-normal text-[var(--color-muted)]">
                      <span aria-hidden>{SERVICE_PRICE_ICON[s]}</span> {t(`alt.scope.${s}`)}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {ROWS.map(row => (
              <tr key={row.key} className="hover:bg-primary/5">
                <th scope="row" className="sticky left-0 bg-[var(--color-surface)] p-3 font-medium">
                  {t(`alt.row.${row.key}`)}
                </th>
                {row.cells.map((cell, i) => (
                  <td key={SERVICES[i]} className="p-3">
                    <span role="img" aria-label={t(`alt.legend.${cell}`)} title={t(`alt.legend.${cell}`)}>
                      {CELL_ICON[cell]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <section>
        <h2 className="mt-8 mb-2 inline-block rounded-lg bg-[var(--color-surface)] px-3 py-1 text-lg font-semibold">
          {t('alt.edge.title')}
        </h2>
        <Card>
          <p className="mb-2 text-[var(--color-muted)]">{t('alt.edge.note')}</p>
          <ul className="list-inside list-disc space-y-1">
            {OUR_EDGE.map(r => (
              <li key={r.key}>{t(`alt.row.${r.key}`)}</li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <h2 className="mt-8 mb-2 inline-block rounded-lg bg-[var(--color-surface)] px-3 py-1 text-lg font-semibold">
          {t('alt.gaps.title')}
        </h2>
        <Card>
          <p className="mb-2 text-[var(--color-muted)]">{t('alt.gaps.note')}</p>
          <ul className="list-inside list-disc space-y-1">
            {OUR_GAPS.map(r => (
              <li key={r.key}>{t(`alt.row.${r.key}`)}</li>
            ))}
          </ul>
        </Card>
      </section>

      <p className="mt-6 text-xs text-[var(--color-muted)]">{t('alt.note')}</p>

      <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        <Link to="/about" className="text-[var(--color-primary)] hover:underline">
          {t('nav.about')}
        </Link>
        <Link to="/data-status" className="text-[var(--color-primary)] hover:underline">
          {t('nav.dataStatus')}
        </Link>
      </nav>
    </div>
  )
}
