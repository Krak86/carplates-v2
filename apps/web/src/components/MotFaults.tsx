import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import InfoPopover from '@/components/InfoPopover'
import InfoText from '@/components/InfoText'
import MarketFlag from '@/components/MarketFlag'
import MotCarModal from '@/components/MotCarModal'
import MotFailChart from '@/components/MotFailChart'
import {
  DEFAULT_MOT_MODE,
  MOT_GROUPS_PREVIEW,
  MOT_MODES,
  MOT_TERMS,
  bandLabel,
  formatShare,
  formatTests,
  groupKey,
  parseMotCarTab,
  yearsLabel,
  type MotCarTab,
  type MotMode
} from '@/components/MotFaults.helpers'
import MotHelp from '@/components/MotHelp'
import MotIssueRow from '@/components/MotIssueRow'
import { reasonLabel } from '@/components/MotReasons'
import SectionHeader from '@/components/SectionHeader'
import ShareButton from '@/components/ShareButton'
import VinToggleSection from '@/components/vin/VinToggleSection'
import { cn } from '@/lib/cn'
import { motQuery } from '@/lib/queries'
import { scrollElementIntoView } from '@/lib/share-section'

type Props = {
  brand: string | null
  model: string | null
  year: number | null
  /** Registry kind text: cars, vans and motorcycles map to different MOT test classes. */
  kind?: string | null
}

const SOURCE_URL = 'https://www.data.gov.uk/dataset/anonymised_mot_test'

/**
 * "Common faults" block: what UK MOT inspections (the yearly roadworthiness test; DVSA anonymised results, Open
 * Government Licence v3.0) found on this make/model at each mileage. Model-level and UK-market — never a statement about
 * this particular car. Collapsed by default (opens from a `?section=faults` share link); fetches only when opened;
 * "no match" shows the usual empty line.
 */
export default function MotFaults({ brand, model, year, kind }: Props): ReactNode {
  const { t, i18n } = useTranslation()
  const [searchParams] = useSearchParams()
  const isShared = searchParams.get('section') === 'faults'
  const [open, setOpen] = useState(() => isShared)
  const [mode, setMode] = useState<MotMode>(DEFAULT_MOT_MODE)
  const [active, setActive] = useState<number | null>(null)
  const [showAllGroups, setShowAllGroups] = useState(false)
  // The readout keeps the last band the pointer touched, so its "?" help can be reached; the highlight still clears.
  const [lastBand, setLastBand] = useState<number | null>(null)
  // The small charts pulse as a "hover me" hint until the viewer has used one.
  const [touched, setTouched] = useState(false)
  // undefined = not decided yet (a shared link may open it once the data is here), null = closed.
  const [car, setCar] = useState<MotCarTab | null | undefined>(undefined)
  const sectionRef = useRef<HTMLDivElement>(null)
  const query = useQuery({
    ...motQuery(brand ?? '', model ?? '', year ?? 0, kind),
    enabled: !!(brand && model && year) && open
  })
  const match = query.data?.match

  useEffect(() => {
    if (isShared && sectionRef.current) scrollElementIntoView(sectionRef.current)
  }, [isShared])

  const handleActive = (band: number | null): void => {
    setActive(band)
    if (band == null) return
    setLastBand(band)
    setTouched(true)
  }

  if (!brand || !model || !year) return null

  const name = match ? `${match.makeName} ${match.modelName}` : ''
  const lang = i18n.language
  const years = match ? yearsLabel(match.testYears[0], match.testYears[1]) : ''
  const groups = match ? (showAllGroups ? match.groups : match.groups.slice(0, MOT_GROUPS_PREVIEW)) : []
  const hiddenGroups = match ? match.groups.length - groups.length : 0
  const readoutBand = active ?? lastBand
  const activeBand = match && readoutBand != null ? match.bands[readoutBand] : null
  const sharedCar =
    isShared && match ? parseMotCarTab(searchParams.get('tab'), match.bands.length, match.edgesKm) : null
  const carState = car === undefined ? sharedCar : car
  const info = match
    ? [
        t('mot.info.lead', { name }),
        t('mot.info.model'),
        match.crossMake && t('mot.info.crossMake', { name }),
        t('mot.info.credit')
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  return (
    <div ref={sectionRef} className="mt-3 border-t border-[var(--color-border)] pt-3">
      <SectionHeader
        icon="🔧"
        title={t('mot.title')}
        info={
          match && (
            <InfoPopover label={t('vin.info.about', { field: t('mot.title') })} title={t('mot.title')}>
              <InfoText text={info} highlight={[name, 'MOT', 'DVSA']} />
            </InfoPopover>
          )
        }
        actions={<ShareButton section="faults" label={t('share.button', { section: t('mot.title') })} />}
        open={open}
        onToggle={() => setOpen(v => !v)}
        showLabel={t('mot.show')}
        hideLabel={t('mot.hide')}
      />

      <div
        aria-hidden={!open}
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          {query.isLoading && <p className="mt-2 text-base text-[var(--color-muted)]">{t('result.loading')}</p>}
          {query.isError && <p className="mt-2 text-base text-[var(--color-muted)]">{t('result.error')}</p>}
          {query.isSuccess && !match && (
            <p className="mt-2 text-base text-[var(--color-muted)]">{t('section.empty')}</p>
          )}

          {match && (
            <>
              <div className="mt-2 space-y-1 rounded-lg bg-[var(--color-surface)]/20 p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {t('mot.what.title')}
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-normal">
                    <MarketFlag market="GB" />
                    {t('mot.ukOnly')}
                  </span>
                  {match.crossMake && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs font-normal">
                      <span aria-hidden>🏷️</span>
                      {t('mot.aka', { name })}
                    </span>
                  )}
                </p>
                <p>{t('mot.what.body')}</p>
                {match.crossMake && <p>{t('mot.info.crossMake', { name })}</p>}
                <p className="text-[var(--color-muted)]">{t('mot.what.uk')}</p>
                <p className="text-[var(--color-muted)]">
                  {t('mot.sample', { name, tests: formatTests(match.tests), years })}
                  <span className="ml-1 inline-block align-middle">
                    <MotHelp term="sample" />
                  </span>
                </p>
                <p>{t('mot.what.car', { name, year })}</p>
                <p className="flex items-center gap-1.5 font-semibold">
                  <span aria-hidden>❗</span>
                  {t('mot.car.cta')}
                </p>
                <div className="group relative inline-block animate-mot-zoom">
                  <button
                    type="button"
                    onClick={() => setCar(carState ?? { km: null, band: lastBand ?? 0 })}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--color-primary)] bg-primary/15 px-3 py-1.5 font-medium text-[var(--color-primary)] hover:bg-primary/25"
                  >
                    <span aria-hidden>🧮</span>
                    {t('mot.car.open', { name, year })}
                  </button>

                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-1/2 -mt-5 -ml-5 size-10 animate-cta-ripple rounded-full bg-[var(--color-primary)]/40"
                  />
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute top-1/2 left-1/2 size-6 -translate-x-1 -translate-y-1 animate-cta-cursor opacity-0 drop-shadow-md group-hover:hidden"
                  >
                    <path
                      d="M5 3l14 8-6 2 4 7-3 1.5-4-7-5 4z"
                      fill="white"
                      stroke="#0c4a6e"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={t('mot.mode.label')}>
                {MOT_MODES.map(m => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      mode === m
                        ? 'border-[var(--color-primary)] bg-primary/15 font-medium'
                        : 'border-[var(--color-border)] text-[var(--color-muted)] hover:bg-primary/10'
                    )}
                  >
                    {t(`mot.mode.${m}`)}
                  </button>
                ))}
              </div>
              <p aria-live="polite" className="mt-1 min-h-8 text-xs text-[var(--color-muted)]">
                {t(`mot.mode.desc.${mode}`, { name })}
              </p>

              <section className="mt-3">
                <h3 className="flex items-center gap-1 text-base font-medium">
                  {t('mot.chart.fail.title')}
                  <MotHelp term="share" />
                </h3>
                <p className="text-xs text-[var(--color-muted)]">
                  {t('mot.chart.fail.caption', {
                    name,
                    years: yearsLabel(match.window.from, match.window.to),
                    kind: t(`mot.kind.${match.kind}`)
                  })}
                  {match.window.widened && ` ${t('mot.chart.fail.widened')}`}
                </p>

                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                  {mode !== 'watch' && (
                    <li className="flex items-center gap-1">
                      <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-[var(--color-mot-fail)]" />
                      {t('mot.fail')}
                      <MotHelp term="fail" />
                    </li>
                  )}
                  {mode !== 'fail' && (
                    <li className="flex items-center gap-1">
                      <svg aria-hidden width="20" height="8" viewBox="0 0 20 8">
                        <line
                          x1="1"
                          x2="19"
                          y1="4"
                          y2="4"
                          stroke="var(--color-mot-watch)"
                          strokeWidth="2"
                          strokeDasharray="5 4"
                          strokeLinecap="round"
                        />
                      </svg>
                      {t('mot.watch')}
                      <MotHelp term="watch" />
                    </li>
                  )}
                  {mode !== 'watch' && (
                    <li className="flex items-center gap-1">
                      <span aria-hidden className="inline-block h-0.5 w-4 rounded bg-[var(--color-fg)]" />
                      {t('mot.average')}
                      <MotHelp term="average" />
                    </li>
                  )}
                </ul>

                <MotFailChart
                  bands={match.bands}
                  edgesKm={match.edgesKm}
                  mode={mode}
                  active={active}
                  onActive={handleActive}
                />

                <p aria-live="polite" className="min-h-[4.5rem] text-sm">
                  {activeBand && readoutBand != null ? (
                    <>
                      <strong>
                        {name}: {bandLabel(match.edgesKm, readoutBand)} {t('mot.axis.kmShort')}
                      </strong>{' '}
                      · {t('mot.readout.tests', { count: formatTests(activeBand.tests) })}
                      {activeBand.failRate == null ? (
                        <span className="text-[var(--color-muted)]"> · {t('mot.readout.notEnough')}</span>
                      ) : (
                        <>
                          {mode !== 'watch' && (
                            <>
                              {' '}
                              · {t('mot.fail')} <strong>{formatShare(activeBand.failRate)}</strong>
                              {activeBand.baselineFailRate != null &&
                                ` (${t('mot.average')} ${formatShare(activeBand.baselineFailRate)})`}
                            </>
                          )}
                          {mode !== 'fail' && (
                            <>
                              {' '}
                              · {t('mot.watch')} <strong>{formatShare(activeBand.watchRate)}</strong>
                            </>
                          )}
                          {mode !== 'watch' && activeBand.dangerousRate != null && (
                            <>
                              {' '}
                              · {t('mot.dangerous')} {formatShare(activeBand.dangerousRate)}
                              <span className="ml-1 inline-block align-middle">
                                <MotHelp term="dangerous" />
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-[var(--color-muted)]">{t('mot.readout.hint')}</span>
                  )}
                </p>

                <details className="text-xs text-[var(--color-muted)]">
                  <summary className="cursor-pointer">
                    {t('mot.table.show')}
                    <span className="ml-1 inline-block align-middle" onClick={e => e.preventDefault()}>
                      <MotHelp term="table" />
                    </span>
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="mt-1 w-full text-left tabular-nums">
                      <thead>
                        <tr>
                          <th className="pr-3 font-medium">{t('mot.axis.km')}</th>
                          <th className="pr-3 font-medium">{t('mot.table.tests')}</th>
                          <th className="pr-3 font-medium">{t('mot.fail')}</th>
                          <th className="pr-3 font-medium">{t('mot.average')}</th>
                          <th className="pr-3 font-medium">{t('mot.watch')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {match.bands.map((b, i) => (
                          <tr key={i}>
                            <td className="pr-3">{bandLabel(match.edgesKm, i)}</td>
                            <td className="pr-3">{formatTests(b.tests)}</td>
                            <td className="pr-3">{formatShare(b.failRate)}</td>
                            <td className="pr-3">{formatShare(b.baselineFailRate)}</td>
                            <td className="pr-3">{formatShare(b.watchRate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>

              <section className="mt-4">
                <h3 className="flex items-center gap-1 text-base font-medium">
                  {t('mot.chart.issues.title')}
                  <MotHelp term="issueTests" />
                </h3>
                <p className="text-xs text-[var(--color-muted)]">{t('mot.chart.issues.caption', { name })}</p>
                <p className="mt-1 text-xs text-[var(--color-primary)]">💡 {t('mot.chart.issues.tip')}</p>

                <ul className="mt-1 divide-y divide-[var(--color-border)]">
                  {groups.map(g => {
                    const reasons = match.reasons.filter(r => r.group === g.code)
                    return (
                      <MotIssueRow
                        key={g.code}
                        label={t(groupKey(g.code))}
                        issue={g}
                        edgesKm={match.edgesKm}
                        mode={mode}
                        active={active}
                        onActive={handleActive}
                        nudge={!touched}
                      >
                        {reasons.length > 0 ? (
                          reasons.map(r => {
                            const translated = reasonLabel(r.code, lang)
                            const original = `${r.item}: ${mode === 'watch' && r.watchText ? r.watchText : r.failText || r.watchText}`
                            return (
                              <MotIssueRow
                                key={r.code}
                                nested
                                label={translated ?? original}
                                original={translated ? original : undefined}
                                issue={r}
                                edgesKm={match.edgesKm}
                                mode={mode}
                                active={active}
                                onActive={handleActive}
                                nudge={!touched}
                              />
                            )
                          })
                        ) : (
                          <li className="py-2 pl-3 text-sm text-[var(--color-muted)]">{t('mot.reasons.none')}</li>
                        )}
                      </MotIssueRow>
                    )
                  })}
                </ul>

                {hiddenGroups > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllGroups(true)}
                    className="mt-1 text-sm text-[var(--color-primary)] underline"
                  >
                    {t('mot.groups.more', { count: hiddenGroups })}
                  </button>
                )}
              </section>

              {carState && (
                <MotCarModal name={name} year={year} match={match} initial={carState} onClose={() => setCar(null)} />
              )}

              <VinToggleSection
                nested
                icon="📖"
                showLabel={t('vin.group.show')}
                hideLabel={t('vin.group.hide')}
                title={t('mot.glossary.title')}
              >
                <dl className="space-y-2 text-sm">
                  {MOT_TERMS.map(term => (
                    <div key={term}>
                      <dt className="font-medium">{t(`mot.help.${term}.title`)}</dt>
                      <dd className="text-[var(--color-muted)]">{t(`mot.help.${term}.body`).replaceAll('\n', ' ')}</dd>
                    </div>
                  ))}
                </dl>
              </VinToggleSection>

              <p className="mt-3 text-xs text-[var(--color-muted)]">
                {t('mot.footer', { years })}{' '}
                <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline">
                  data.gov.uk
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
