import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  MIN_BRAND_LENGTH,
  MIN_INDEXABLE_LENGTH,
  REGION_NAMES,
  regionName,
  resolveVehicleColor,
  resolveVehicleKind,
  SEARCH_SORT_KEYS,
  VEHICLE_COLORS,
  VEHICLE_FUELS,
  VEHICLE_KINDS,
  VEHICLE_PURPOSES
} from '@carplates/shared'
import type { SearchResultRow } from '@carplates/shared'

import BrandLogo from '@/components/BrandLogo'
import ColorSwatch from '@/components/ColorSwatch'
import { BODY_ICON, FUEL_ICON, getBodyInfo, getFuelIcon } from '@/components/ResultCard.helpers'
import RegionFlag from '@/components/RegionFlag'
import RegionMap from '@/components/RegionMap'
import Card from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import VehicleKindIcon from '@/components/VehicleKindIcon'
import { OPER_STATUS_ICON, OPER_STATUSES, operStatus } from '@/lib/oper-info'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'
import { useRegionLabel } from '@/lib/region-label'
import { formatVehicleLabel } from '@/lib/vehicle-label'
import OperStatusSelect from '@/routes/advanced-search/OperStatusSelect'
import { useAdvancedSearchActions } from '@/routes/advanced-search/use-advanced-search-actions'

const inputClass = 'w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm'
const invalidInputClass = 'border-red-500!'

function ResultRow({ row }: { row: SearchResultRow }): ReactNode {
  const { t } = useTranslation()
  const label = formatVehicleLabel({ brand: row.brand, model: row.model, year: row.makeYear, color: null })
  const regionLabel = useRegionLabel()
  const region = regionLabel(regionName(row.plate))
  const kind = resolveVehicleKind(row.kind)
  const body = getBodyInfo(row.body)
  const iconsTitle = [
    row.color && `${t('field.color')}: ${row.color}`,
    row.fuel && `${t('field.fuel')}: ${row.fuel}`,
    kind && `${t('advancedSearch.kind')}: ${t(`vehicleKind.${kind}`)}`,
    row.body && `${t('advancedSearch.body')}: ${row.body}`,
    row.operCode != null && `${t('advancedSearch.oper')}: ${t(`oper.status.${operStatus(row.operCode)}`)}`
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <Link
      viewTransition
      to={`/${row.plate}`}
      className="-mx-4 flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--color-border)]/40"
    >
      <div className="flex min-w-0 items-center gap-3">
        <BrandLogo brand={row.brand} size="sm" placeholder />
        <div className="min-w-0">
          <div className="font-medium">{label || row.plate}</div>
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
            <span className="text-[var(--color-primary)] underline">{row.plate}</span>
            {region && (
              <span className="inline-flex items-center gap-1.5">
                · <RegionFlag region={regionName(row.plate)} /> {region}
              </span>
            )}
          </div>
          {row.operName && (
            <div className="truncate text-xs text-[var(--color-muted)]">
              {row.operCode != null && <span aria-hidden>{OPER_STATUS_ICON[operStatus(row.operCode)]} </span>}
              {row.operName}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-lg" title={iconsTitle || undefined}>
        {kind && (
          <VehicleKindIcon
            kind={kind}
            color={resolveVehicleColor(row.color)}
            animated={false}
            className="h-6 w-6"
            title={t(`vehicleKind.${kind}`)}
          />
        )}
        {body && <span aria-hidden>{body.icon}</span>}
        <ColorSwatch value={row.color} />
        {row.fuel && <span aria-hidden>{getFuelIcon(row.fuel)}</span>}
      </div>
    </Link>
  )
}

// Lazy-loaded (see App.tsx).
export default function AdvancedSearchRoute(): ReactNode {
  const { t } = useTranslation()
  const regionLabel = useRegionLabel()
  const online = useOnlineStatus()
  const {
    filters,
    updateFilter,
    reset,
    submit,
    canSearch,
    textError,
    bodyTooShort,
    page,
    setPage,
    sort,
    dir,
    setSort,
    pageSize,
    hasAnyFilter,
    yearFromInvalid,
    yearToInvalid,
    brandSuggestions,
    modelSuggestions,
    bodySuggestions,
    operations,
    results
  } = useAdvancedSearchActions()

  // For a very broad match, `total` is the API's capped floor (see search.service.ts's
  // SEARCH_COUNT_CAP), not the real count — paging stops at that boundary rather than letting
  // pagination run arbitrarily deep into an unbounded result set.
  const totalPages = results.data ? Math.max(1, Math.ceil(results.data.total / pageSize)) : 1

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-4 inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 backdrop-blur-sm">
        <h1 className="text-2xl font-bold">{t('advancedSearch.title')}</h1>
        <p className="text-[var(--color-muted)]">{t('advancedSearch.subtitle')}</p>
      </div>

      {!online && (
        <p className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          {t('offline.needsConnection')}
        </p>
      )}

      <Card className="mb-6">
        <form
          onSubmit={e => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              {t('advancedSearch.brand')}
              <span className="flex items-center gap-2">
                <BrandLogo brand={filters.brand.trim() || null} />
                <input
                  type="text"
                  list="advanced-search-brands"
                  value={filters.brand}
                  onChange={e => updateFilter('brand', e.target.value)}
                  placeholder={t('advancedSearch.brandPlaceholder')}
                  className={inputClass}
                />
              </span>
              <datalist id="advanced-search-brands">
                {brandSuggestions.map(s => (
                  <option key={s.brand} value={s.brand} />
                ))}
              </datalist>
              {textError === 'brandTooShort' && (
                <span className="text-xs text-[var(--color-muted)]">
                  {t('advancedSearch.minChars', { count: MIN_BRAND_LENGTH })}
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
              {textError === 'needsIndexable' && (
                <span className="text-xs text-[var(--color-muted)]">
                  {t('advancedSearch.needsIndexable', { count: MIN_INDEXABLE_LENGTH })}
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
              <span className="flex min-h-6 items-center gap-1.5">
                {t('advancedSearch.fuel')}
                {!!filters.fuel && <span aria-hidden>{FUEL_ICON[filters.fuel]}</span>}
              </span>
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
              <span className="flex min-h-6 items-center gap-1.5">
                {t('advancedSearch.color')}
                <ColorSwatch value={filters.color || null} />
              </span>
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

            <label className="flex flex-col gap-1 text-sm">
              <span className="flex min-h-6 items-center gap-1.5">
                {t('advancedSearch.kind')}
                {!!filters.kind && (
                  <VehicleKindIcon
                    kind={filters.kind}
                    color={filters.color || null}
                    animated={false}
                    className="h-6 w-6"
                  />
                )}
              </span>
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

            <label className="flex flex-col gap-1 text-sm">
              {t('advancedSearch.purpose')}
              <select
                value={filters.purpose}
                onChange={e => updateFilter('purpose', e.target.value as typeof filters.purpose)}
                className={inputClass}
              >
                <option value="">{t('advancedSearch.anyPurpose')}</option>
                {VEHICLE_PURPOSES.map(p => (
                  <option key={p} value={p}>
                    {t(`vehiclePurpose.${p}`)}
                  </option>
                ))}
              </select>
              {!!filters.purpose && (
                <span className="text-xs text-[var(--color-muted)]">{t(`vehiclePurposeDesc.${filters.purpose}`)}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t('advancedSearch.body')}
              <input
                type="text"
                list="advanced-search-bodies"
                value={filters.body}
                onChange={e => updateFilter('body', e.target.value)}
                placeholder={t('advancedSearch.bodyPlaceholder')}
                className={inputClass}
              />
              <datalist id="advanced-search-bodies">
                {bodySuggestions.map(s => {
                  const info = getBodyInfo(s.body)
                  return (
                    <option
                      key={s.body}
                      value={s.body}
                      label={info ? `${info.icon} ${t(info.descriptionKey)}` : undefined}
                    />
                  )
                })}
              </datalist>
              {bodyTooShort && (
                <span className="text-xs text-[var(--color-muted)]">
                  {t('advancedSearch.needsIndexable', { count: MIN_INDEXABLE_LENGTH })}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              {t('advancedSearch.region')}
              <select
                value={filters.region}
                onChange={e => updateFilter('region', e.target.value)}
                className={inputClass}
              >
                <option value="">{t('advancedSearch.anyRegion')}</option>
                {REGION_NAMES.map(r => (
                  <option key={r} value={r}>
                    {regionLabel(r)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="flex min-h-6 items-center gap-1.5">
                {t('advancedSearch.oper')}
                {!!filters.oper && <span aria-hidden>{OPER_STATUS_ICON[operStatus(Number(filters.oper))]}</span>}
              </span>
              <OperStatusSelect
                value={filters.oper}
                onChange={value => updateFilter('oper', value)}
                operations={operations}
                className={inputClass}
              />
              <span className="text-xs text-[var(--color-muted)]">{t('advancedSearch.operHint')}</span>
            </label>
          </div>

          {filters.region && <RegionMap region={filters.region} />}

          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-[var(--color-primary)]">{t('advancedSearch.legend')}</summary>
            <p className="mt-1 text-xs text-[var(--color-muted)]">{t('advancedSearch.legendHint')}</p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {VEHICLE_COLORS.map(c => (
                <li key={c} className="inline-flex items-center gap-1.5">
                  <ColorSwatch value={c} /> {t(`vehicleColor.${c}`)}
                </li>
              ))}
            </ul>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {VEHICLE_FUELS.map(f => (
                <li key={f} className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{FUEL_ICON[f]}</span> {t(`vehicleFuel.${f}`)}
                </li>
              ))}
            </ul>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {VEHICLE_KINDS.map(k => (
                <li key={k} className="inline-flex items-center gap-1.5">
                  <VehicleKindIcon kind={k} animated={false} className="h-6 w-6" /> {t(`vehicleKind.${k}`)}
                </li>
              ))}
            </ul>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {OPER_STATUSES.map(st => (
                <li key={st} className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{OPER_STATUS_ICON[st]}</span> {t(`oper.status.${st}`)}
                </li>
              ))}
            </ul>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2">
              {Object.entries(BODY_ICON).map(([cat, icon]) => (
                <li key={cat} className="flex items-start gap-1.5">
                  <span aria-hidden>{icon}</span>
                  <span className="text-[var(--color-muted)]">{t(`body.cat.${cat}`)}</span>
                </li>
              ))}
            </ul>
            <ul className="mt-2 space-y-1">
              {VEHICLE_PURPOSES.map(p => (
                <li key={p}>
                  <b>{t(`vehiclePurpose.${p}`)}</b>:{' '}
                  <span className="text-[var(--color-muted)]">{t(`vehiclePurposeDesc.${p}`)}</span>
                </li>
              ))}
            </ul>
          </details>

          <div className="mt-3 flex items-center gap-4">
            <button
              type="submit"
              disabled={!canSearch}
              className="rounded-lg bg-[var(--color-primary)] px-5 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('advancedSearch.search')}
            </button>

            {(hasAnyFilter || canSearch) && (
              <button
                type="button"
                onClick={reset}
                className="text-sm text-[var(--color-primary)] underline hover:no-underline"
              >
                {t('advancedSearch.reset')}
              </button>
            )}
          </div>
        </form>
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
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="inline-block rounded-lg bg-[var(--color-bg)]/85 px-3 py-1.5 text-sm text-[var(--color-muted)] backdrop-blur-sm">
              {results.data.totalIsExact
                ? t('advancedSearch.resultsCount', { count: results.data.total })
                : t('advancedSearch.resultsCountAtLeast', { count: results.data.total })}
            </p>

            <label className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-bg)]/85 px-3 py-1 text-sm whitespace-nowrap text-[var(--color-muted)] backdrop-blur-sm">
              {t('advancedSearch.sortBy')}
              <select
                value={sort}
                onChange={e => setSort(e.target.value as typeof sort, dir)}
                className={cn(inputClass, 'w-auto py-1')}
              >
                {SEARCH_SORT_KEYS.map(k => (
                  <option key={k} value={k}>
                    {t(`advancedSearch.sort.${k}`)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSort(sort, dir === 'asc' ? 'desc' : 'asc')}
                title={t(dir === 'asc' ? 'advancedSearch.sortAsc' : 'advancedSearch.sortDesc')}
                aria-label={t(dir === 'asc' ? 'advancedSearch.sortAsc' : 'advancedSearch.sortDesc')}
                className="rounded-lg border border-[var(--color-border)] px-2 py-1 hover:bg-[var(--color-surface)]"
              >
                {dir === 'asc' ? '↑' : '↓'}{' '}
                {t(dir === 'asc' ? 'advancedSearch.sortAscShort' : 'advancedSearch.sortDescShort')}{' '}
                <span aria-hidden>?</span>
              </button>
            </label>
          </div>

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
