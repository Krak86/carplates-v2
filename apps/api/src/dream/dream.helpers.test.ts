import { describe, expect, it } from 'vitest'

import { summarizeProjects } from './dream.helpers.js'

const p = (
  status: string,
  oblastCode: string | null,
  committedUah: number,
  projectType: string | null = 'construction'
) => ({
  status,
  projectType,
  oblastCode,
  committedUah,
  updatedAt: new Date('2026-11-01T00:00:00Z')
})

describe('summarizeProjects', () => {
  it('returns null when nothing counts', () => {
    expect(summarizeProjects([])).toBeNull()
    expect(summarizeProjects([p('cancelled', 'UA51', 10)])).toBeNull()
  })

  it('groups by plate region, skips cancelled, sorts by project count', () => {
    const out = summarizeProjects([
      p('active', 'UA51', 100),
      p('pending', 'UA51', 50.5, 'rehabilitation'),
      p('cancelled', 'UA51', 999),
      p('active', 'UA80', 10)
    ])
    expect(out?.total).toEqual({
      projects: 3,
      committedUah: 160.5,
      byStatus: { active: 2, pending: 1 },
      byType: { construction: 2, rehabilitation: 1 }
    })
    expect(out?.regions.map(r => r.region)).toEqual(['Одеська область', 'Київ'])
    expect(out?.regions[0]).toMatchObject({ projects: 2, committedUah: 150.5 })
  })

  it('counts a project with an unknown oblast in the total only', () => {
    const out = summarizeProjects([p('active', null, 5), p('active', 'UA99', 5), p('active', 'UA63', 5, null)])
    expect(out?.total.projects).toBe(3)
    expect(out?.unlocated).toBe(2)
    expect(out?.regions).toHaveLength(1)
    expect(out?.regions[0]?.byType).toEqual({ other: 1 })
  })
})
