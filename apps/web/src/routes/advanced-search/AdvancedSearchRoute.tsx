import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { regionName, VEHICLE_COLORS, VEHICLE_FUELS, VEHICLE_KINDS } from '@carplates/shared'
import type { SearchResultRow } from '@carplates/shared'

import ColorSwatch from '@/components/ColorSwatch'
import { FUEL_ICON, getFuelIcon } from '@/components/ResultCard.helpers'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { formatVehicleLabel } from '@/lib/vehicle-label'
import { MIN_TEXT_FILTER_LENGTH, useAdvancedSearchActions } from '@/routes/advanced-search/use-advanced-search-actions'

const inputClass = 'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm'
const invalidInputClass = 'border-red-500!'

function ResultRow({ row }: { row: SearchResultRow }): ReactNode {
  const { t } = useTranslation()
  const label = formatVehicleLabel({ brand: row.brand, model: row.model, year: row.makeYear, color: null })
  const region = regionName(row.plate)
  const iconsTitle = [row.color && `${t('field.color')}: ${row.color}`, row.fuel && `${t('field.fuel')}: ${row.fuel}`]
    .filter(Boolean)
    .join('\n')

  return (
    <Link
      to={`/${row.plate}`}
      className="-mx-4 flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--color-border)]/40"
    >
      <div className="min-w-0">
        <div className="font-medium">{label || row.plate}</div>
        <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
          <span className="text-[var(--color-primary)] underline">{row.plate}</span>
          {region && <span>· {region}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-lg" title={iconsTitle || undefined}>
        <ColorSwatch value={row.color} />
        {row.fuel && <span aria-hidden>{getFuelIcon(row.fuel)}</span>}
      </div>
    </Link>
  )
}

// Lazy-loaded (see App.tsx).
export default function AdvancedSearchRoute(): ReactNode {
  const { t } = useTranslation()
  const {
    filters,
    updateFilter,
    reset,
    page,
    setPage,
    pageSize,
    hasAnyFilter,
    yearFromInvalid,
    yearToInvalid,
    brandSuggestions,
    modelSuggestions,
    results
  } = useAdvancedSearchActions()

  const brandTooShort = filters.brand.length > 0 && filters.brand.length < MIN_TEXT_FILTER_LENGTH
  const modelTooShort = filters.model.length > 0 && filters.model.length < MIN_TEXT_FILTER_LENGTH

  // For a very broad match, `total` is the API's capped floor (see search.service.ts's
  // SEARCH_COUNT_CAP), not the real count — paging stops at that boundary rather than letting
  // pagination run arbitrarily deep into an unbounded result set.
  const totalPages = results.data ? Math.max(1, Math.ceil(results.data.total / pageSize)) : 1

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4 inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 backdrop-blur-sm">
        <h1 className="text-2xl font-bold">{t('advancedSearch.title')}</h1>
        <p className="text-[var(--color-muted)]">{t('advancedSearch.subtitle')}</p>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            {t('advancedSearch.brand')}
            <input
              type="text"
              list="advanced-search-brands"
              value={filters.brand}
              onChange={e => updateFilter('brand', e.target.value)}
              placeholder={t('advancedSearch.brandPlaceholder')}
              className={inputClass}
            />
            <datalist id="advanced-search-brands">
              {brandSuggestions.map(s => (
                <option key={s.brand} value={s.brand} />
              ))}
            </datalist>
            {brandTooShort && (
              <span className="text-xs text-[var(--color-muted)]">
                {t('advancedSearch.minChars', { count: MIN_TEXT_FILTER_LENGTH })}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t('advancedSearch.model')}
            <input
              type="text"
              list="advanced-search-models"
              value={filters.model}
              onChange={e => updateFilter('model', e.target.value)}
              placeholder={t('advancedSearch.modelPlaceholder')}
              className={inputClass}
            />
            <datalist id="advanced-search-models">
              {modelSuggestions.map(s => (
                <option key={s.model} value={s.model} />
              ))}
            </datalist>
            {modelTooShort && (
              <span className="text-xs text-[var(--color-muted)]">
                {t('advancedSearch.minChars', { count: MIN_TEXT_FILTER_LENGTH })}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t('advancedSearch.yearFrom')}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={filters.yearFrom}
              onChange={e => updateFilter('yearFrom', e.target.value.replace(/\D/g, ''))}
              className={cn(inputClass, yearFromInvalid && invalidInputClass)}
            />
            {yearFromInvalid && <span className="text-xs text-red-500">{t('advancedSearch.yearInvalid')}</span>}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t('advancedSearch.yearTo')}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={filters.yearTo}
              onChange={e => updateFilter('yearTo', e.target.value.replace(/\D/g, ''))}
              className={cn(inputClass, yearToInvalid && invalidInputClass)}
            />
            {yearToInvalid && <span className="text-xs text-red-500">{t('advancedSearch.yearInvalid')}</span>}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t('advancedSearch.fuel')}
            <select
              value={filters.fuel}
              onChange={e => updateFilter('fuel', e.target.value as typeof filters.fuel)}
              className={inputClass}
            >
              <option value="">{t('advancedSearch.anyFuel')}</option>
              {VEHICLE_FUELS.map(f => (
                <option key={f} value={f}>
                  {FUEL_ICON[f]} {t(`vehicleFuel.${f}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t('advancedSearch.color')}
            <select
              value={filters.color}
              onChange={e => updateFilter('color', e.target.value as typeof filters.color)}
              className={inputClass}
            >
              <option value="">{t('advancedSearch.anyColor')}</option>
              {VEHICLE_COLORS.map(c => (
                <option key={c} value={c}>
                  {t(`vehicleColor.${c}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            {t('advancedSearch.kind')}
            <select
              value={filters.kind}
              onChange={e => updateFilter('kind', e.target.value as typeof filters.kind)}
              className={inputClass}
            >
              <option value="">{t('advancedSearch.anyKind')}</option>
              {VEHICLE_KINDS.map(k => (
                <option key={k} value={k}>
                  {t(`vehicleKind.${k}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-sm text-[var(--color-primary)] underline hover:no-underline"
          >
            {t('advancedSearch.reset')}
          </button>
        )}
      </Card>

      {!hasAnyFilter && (
        <p className="inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-[var(--color-muted)] backdrop-blur-sm">
          {t('advancedSearch.prompt')}
        </p>
      )}

      {hasAnyFilter && results.isPending && (
        <p className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-[var(--color-muted)] backdrop-blur-sm">
          <Spinner /> {t('result.loading')}
        </p>
      )}

      {hasAnyFilter && results.isError && (
        <p className="inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-[var(--color-muted)] backdrop-blur-sm">
          {t('advancedSearch.error')}
        </p>
      )}

      {hasAnyFilter && results.isSuccess && (
        <>
          <p className="mb-2 inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-sm text-[var(--color-muted)] backdrop-blur-sm">
            {results.data.totalIsExact
              ? t('advancedSearch.resultsCount', { count: results.data.total })
              : t('advancedSearch.resultsCountAtLeast', { count: results.data.total })}
          </p>

          {results.data.results.length === 0 ? (
            <p className="inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-[var(--color-muted)] backdrop-blur-sm">
              {t('advancedSearch.noResults')}
            </p>
          ) : (
            <Card className="divide-y divide-[var(--color-border)] p-0">
              {results.data.results.map(row => (
                <div key={row.plate} className="px-4">
                  <ResultRow row={row} />
                </div>
              ))}
            </Card>
          )}

          {results.data.total > pageSize && (
            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center gap-3 rounded-lg bg-[var(--color-bg)]/85 p-2 text-sm backdrop-blur-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className={cn(
                    'rounded-lg border border-[var(--color-border)] px-3 py-1.5',
                    page <= 1 ? 'opacity-40' : 'hover:bg-[var(--color-surface)]'
                  )}
                >
                  {t('advancedSearch.prev')}
                </button>
                <span className="text-[var(--color-muted)]">{t('advancedSearch.pageOf', { page, totalPages })}</span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className={cn(
                    'rounded-lg border border-[var(--color-border)] px-3 py-1.5',
                    page >= totalPages ? 'opacity-40' : 'hover:bg-[var(--color-surface)]'
                  )}
                >
                  {t('advancedSearch.next')}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
