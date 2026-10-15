import { useState } from 'react'
import type { ReactNode } from 'react'
import type { RdwSpecs } from '@carplates/shared'
import { useTranslation } from 'react-i18next'

import {
  ADULT_KG,
  caravanAdvice,
  grossMassOf,
  kerbMassOf,
  licenceFor,
  loadKg,
  payloadKg,
  towVerdict,
  TRAILER_PRESETS,
  type TowVerdict
} from '@/components/RdwInsights.helpers'
import RdwMassSchema from '@/components/RdwMassSchema'
import type { OwnFigures } from '@/components/RdwSpecs.helpers'
import { cn } from '@/lib/cn'

type Props = {
  specs: RdwSpecs
  own?: OwnFigures
  /** Heavy registry kind: the mass schema opens on the truck drawing. */
  truck?: boolean
  locale: string
}

/** Ukrainian Traffic Rules (ПДР, resolution 1306-2001-п) — the source of every figure in the rules box. */
const TRAFFIC_RULES_URL = 'https://zakon.rada.gov.ua/laws/show/1306-2001-%D0%BF'
const UA_RULE_KEYS = ['trailerSpeed', 'towSpeed', 'licence', 'size', 'mass'] as const
const MAX_LUGGAGE_KG = 300
const LUGGAGE_STEP_KG = 10
const DEFAULT_ADULTS = 2
const VERDICT_ICON: Record<TowVerdict, string> = { any: '✅', braked: '🛑', no: '❌' }

/**
 * "What can I do with it" in the Mass group: the payload left after the people and luggage chosen with two sliders, a
 * row of typical trailers marked fit / needs brakes / too heavy against the towing limits, and the licence category the
 * chosen combination needs. All derived from the Specs figures and the registry's own masses.
 */
export default function RdwTowing({ specs, own, truck = false, locale }: Props): ReactNode {
  const { t } = useTranslation()
  const kerb = kerbMassOf(specs, own)
  const gross = grossMassOf(specs, own)
  const payload = payloadKg(gross, kerb)
  const braked = specs.towBrakedKg ? Math.round(specs.towBrakedKg.median) : null
  const unbraked = specs.towUnbrakedKg ? Math.round(specs.towUnbrakedKg.median) : null
  const seats = specs.seats ? Math.max(1, Math.round(specs.seats.median)) : 5
  const [adults, setAdults] = useState(DEFAULT_ADULTS)
  const [luggage, setLuggage] = useState(0)
  const [trailerKg, setTrailerKg] = useState<number | null>(null)
  const people = Math.min(adults, seats)
  const used = loadKg(people, luggage)
  const left = payload === null ? null : payload - used
  const canTow = braked !== null || unbraked !== null
  const fmt = (kg: number): string => kg.toLocaleString(locale)

  if (payload === null && !canTow) return null

  return (
    <div className="my-2 rounded-lg bg-[var(--color-surface)]/20 p-3">
      <p className="mb-2 text-sm font-medium">🧳 {t('rdw.tow.title')}</p>

      {payload !== null && left !== null && (
        <div>
          <p className="text-sm">{t('rdw.tow.payload', { kg: fmt(payload) })}</p>

          <label className="mt-2 flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0">{t('rdw.tow.people', { n: people })}</span>
            <input
              type="range"
              min={1}
              max={seats}
              value={people}
              onChange={e => setAdults(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="w-28 shrink-0">{t('rdw.tow.luggage', { kg: luggage })}</span>
            <input
              type="range"
              min={0}
              max={MAX_LUGGAGE_KG}
              step={LUGGAGE_STEP_KG}
              value={luggage}
              onChange={e => setLuggage(Number(e.target.value))}
              className="w-full accent-[var(--color-primary)]"
            />
          </label>

          <div
            className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--color-border)]"
            role="img"
            aria-label={t('rdw.tow.barLabel', { used, payload })}
          >
            <div
              className={cn('h-full', left < 0 ? 'bg-red-500' : 'bg-[var(--color-primary)]')}
              style={{ width: `${Math.min(100, (used / payload) * 100)}%` }}
            />
          </div>

          <p className={cn('mt-1 text-xs', left < 0 ? 'font-medium text-red-500' : 'text-[var(--color-muted)]')}>
            {left < 0
              ? t('rdw.tow.over', { kg: fmt(-left) })
              : t('rdw.tow.left', { kg: fmt(left), adults: Math.floor(left / ADULT_KG) })}
          </p>
        </div>
      )}

      {canTow && (
        <div className="mt-3">
          <p className="text-sm">{t('rdw.tow.trailerTitle')}</p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {TRAILER_PRESETS.map(preset => {
              const verdict = towVerdict(preset.kg, unbraked, braked)
              return (
                <button
                  key={preset.key}
                  type="button"
                  aria-pressed={trailerKg === preset.kg}
                  onClick={() => setTrailerKg(trailerKg === preset.kg ? null : preset.kg)}
                  title={t(`rdw.tow.verdict.${verdict}`)}
                  className={cn(
                    'rounded-full border px-2 py-0.5 text-xs transition-colors',
                    trailerKg === preset.kg
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/15'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-border)]/40'
                  )}
                >
                  {VERDICT_ICON[verdict]} {preset.icon} {t(`rdw.tow.trailer.${preset.key}`)} · {fmt(preset.kg)}{' '}
                  {t('field.unitKg')}
                </button>
              )
            })}
          </div>

          {trailerKg !== null && (
            <p className="mt-2 text-sm">
              {t(`rdw.tow.verdict.${towVerdict(trailerKg, unbraked, braked)}`)}
              {gross &&
                ` ${t('rdw.tow.licence', { category: t(`rdw.tow.category.${licenceFor(gross, trailerKg)}`) })}`}{' '}
              {t('rdw.tow.trailerSpeed')}
            </p>
          )}

          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {t('rdw.tow.limits', {
              braked: braked ? fmt(braked) : '—',
              unbraked: unbraked ? fmt(unbraked) : '—'
            })}
            {kerb && ` ${t('rdw.tow.caravanTip', { kg: fmt(caravanAdvice(kerb)) })}`}
          </p>
        </div>
      )}

      <RdwMassSchema gross={gross} braked={braked} truck={truck} locale={locale} />

      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-[var(--color-primary)]">⚖️ {t('rdw.tow.rules.title')}</summary>

        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[var(--color-muted)]">
          {UA_RULE_KEYS.map(key => (
            <li key={key}>{t(`rdw.tow.rules.${key}`)}</li>
          ))}
        </ul>

        <p className="mt-1">
          <a
            href={TRAFFIC_RULES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--color-primary)] underline hover:no-underline"
          >
            {t('rdw.tow.rules.source')}
          </a>
        </p>
      </details>

      <p className="mt-2 text-xs text-[var(--color-muted)]">{t('rdw.tow.disclaimer')}</p>
    </div>
  )
}
