import { describe, it, expect } from 'vitest'
import { FAVORITE_LABEL_LIMIT, type UserSettings } from '@carplates/shared'

import {
  addLabel,
  deleteLabel,
  filterFavorites,
  labelsOf,
  nextFreeColor,
  renameLabel,
  toggleTag
} from '@/lib/favorite-labels'
import { DEFAULT_USER_SETTINGS } from '@/lib/user-settings'

const withLabels = (n: number): UserSettings =>
  Array.from({ length: n }).reduce<UserSettings>((s, _, i) => addLabel(s, `id${i}`, `L${i}`), DEFAULT_USER_SETTINGS)

describe('favorite labels', () => {
  it('gives each new label the first unused color', () => {
    const s = withLabels(3)
    expect(s.labels.map(l => l.color)).toEqual([0, 1, 2])
  })

  it('reuses the color of a deleted label', () => {
    const s = deleteLabel(withLabels(3), 'id1')
    expect(nextFreeColor(s.labels)).toBe(1)
    expect(addLabel(s, 'new', 'New').labels.at(-1)?.color).toBe(1)
  })

  it('stops at the limit and ignores blank names', () => {
    const full = withLabels(FAVORITE_LABEL_LIMIT)
    expect(full.labels).toHaveLength(FAVORITE_LABEL_LIMIT)
    expect(addLabel(full, 'x', 'Extra')).toBe(full)
    expect(addLabel(DEFAULT_USER_SETTINGS, 'x', '   ')).toBe(DEFAULT_USER_SETTINGS)
  })

  it('renames without changing the color', () => {
    const s = renameLabel(withLabels(2), 'id1', ' Work ')
    expect(s.labels[1]).toEqual({ id: 'id1', name: 'Work', color: 1 })
  })

  it('toggles tags and skips unknown ids when resolving', () => {
    expect(toggleTag(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleTag(['a', 'b'], 'a')).toEqual(['b'])
    const s = withLabels(2)
    expect(labelsOf(s.labels, ['id1', 'gone']).map(l => l.id)).toEqual(['id1'])
    expect(labelsOf(s.labels, undefined)).toEqual([])
  })
})

describe('filterFavorites', () => {
  const entries = [
    { value: 'АА1234ВВ', label: 'Toyota Camry (2015)', tags: ['a'] },
    { value: 'КА5555ІІ', label: 'Skoda Octavia', tags: ['b'] },
    { value: 'WVWZZZ1JZXW000001', label: null }
  ]

  it('returns everything for an empty query and selection', () => {
    expect(filterFavorites(entries, ' ', [])).toEqual(entries)
  })

  it('matches the value, the vehicle label and a Latin-typed plate', () => {
    expect(filterFavorites(entries, 'camry', [])).toEqual([entries[0]])
    expect(filterFavorites(entries, 'wvwzzz', [])).toEqual([entries[2]])
    expect(filterFavorites(entries, 'KA5555', [])).toEqual([entries[1]])
  })

  it('keeps entries carrying any selected label, combined with the query', () => {
    expect(filterFavorites(entries, '', ['a', 'b'])).toEqual([entries[0], entries[1]])
    expect(filterFavorites(entries, 'skoda', ['a'])).toEqual([])
  })
})
