import { useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FAVORITE_LABEL_LIMIT, type FavoriteLabel } from '@carplates/shared'

import LabelChip from '@/components/LabelChip'
import Card from '@/components/ui/Card'
import { canAddLabel, labelColorVar, newLabelId } from '@/lib/favorite-labels'
import { stripFavoriteTag } from '@/lib/favorites-db'
import { useSettingsStore } from '@/store/settings-store'

const BUTTON_CLASS = 'rounded-lg border border-[var(--color-border)] px-3 py-1 text-sm hover:bg-[var(--color-bg)]'
const INPUT_CLASS = 'min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5'
const NAME_MAX = 24

/** Create / rename / delete favorite labels. Colors are assigned automatically; tagging a favorite happens on the card / list. */
export default function LabelsTab(): ReactNode {
  const { t } = useTranslation()
  const settings = useSettingsStore(s => s.settings)
  const createLabel = useSettingsStore(s => s.createLabel)
  const renameLabel = useSettingsStore(s => s.renameLabel)
  const removeLabel = useSettingsStore(s => s.removeLabel)
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)

  const { labels } = settings
  const canAdd = canAddLabel(settings)

  const handleAdd = (): void => {
    if (!draft.trim() || !canAdd) return
    createLabel(newLabelId(), draft)
    setDraft('')
  }

  const handleSaveRename = (): void => {
    if (editing?.name.trim()) renameLabel(editing.id, editing.name)
    setEditing(null)
  }

  const handleDelete = (label: FavoriteLabel): void => {
    if (!window.confirm(t('settings.labels.deleteConfirm', { name: label.name }))) return
    removeLabel(label.id)
    void stripFavoriteTag(label.id)
  }

  return (
    <section>
      <h2 className="mb-2 inline-block rounded-lg bg-[var(--color-surface)] px-3 py-1 text-lg font-semibold">
        {t('settings.labels.title')}
      </h2>
      <Card className="p-0">
        <p className="p-4 pb-2 text-sm text-[var(--color-muted)]">
          {t('settings.labels.intro', { limit: FAVORITE_LABEL_LIMIT })}
        </p>

        {labels.length === 0 && <p className="p-4 text-sm text-[var(--color-muted)]">{t('settings.labels.empty')}</p>}

        <ul className="divide-y divide-[var(--color-border)]">
          {labels.map(label => (
            <li key={label.id} className="flex flex-wrap items-center gap-2 p-4">
              <span
                aria-hidden
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: labelColorVar(label.color) }}
              />

              {editing?.id === label.id ? (
                <>
                  <input
                    autoFocus
                    value={editing.name}
                    maxLength={NAME_MAX}
                    aria-label={t('settings.labels.name')}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditing({ id: label.id, name: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveRename()
                      if (e.key === 'Escape') setEditing(null)
                    }}
                    className={INPUT_CLASS}
                  />
                  <button type="button" onClick={handleSaveRename} className={BUTTON_CLASS}>
                    {t('settings.labels.save')}
                  </button>
                  <button type="button" onClick={() => setEditing(null)} className={BUTTON_CLASS}>
                    {t('settings.labels.cancel')}
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1">
                    <LabelChip label={label} className="border-0 px-0 text-sm" />
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing({ id: label.id, name: label.name })}
                    className={BUTTON_CLASS}
                  >
                    {t('settings.labels.rename')}
                  </button>
                  <button type="button" onClick={() => handleDelete(label)} className={`${BUTTON_CLASS} text-red-600`}>
                    {t('settings.labels.delete')}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <form
          onSubmit={e => {
            e.preventDefault()
            handleAdd()
          }}
          className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] p-4"
        >
          <input
            value={draft}
            maxLength={NAME_MAX}
            disabled={!canAdd}
            placeholder={t('settings.labels.namePlaceholder')}
            aria-label={t('settings.labels.name')}
            onChange={e => setDraft(e.target.value)}
            className={INPUT_CLASS}
          />
          <button
            type="submit"
            disabled={!canAdd || !draft.trim()}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            + {t('settings.labels.new')}
          </button>
          {!canAdd && (
            <span className="text-sm text-[var(--color-muted)]">
              {t('settings.labels.limit', { limit: FAVORITE_LABEL_LIMIT })}
            </span>
          )}
        </form>
      </Card>
    </section>
  )
}
