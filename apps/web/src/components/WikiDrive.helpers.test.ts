import { describe, it, expect } from 'vitest'

import { driveRows, parseGearboxes, parseLayout } from '@/components/WikiDrive.helpers'

const t = (key: string, options?: Record<string, unknown>): string =>
  options?.gears ? `${key}:${String(options.gears)}` : key

describe('parseLayout', () => {
  it('reads engine position and every drive named in a layout list', () => {
    expect(parseLayout('Front-engine, front-wheel-drive; Front-engine, four-wheel-drive')).toEqual({
      positions: ['front'],
      wheels: ['fwd', 'awd']
    })
    expect(
      parseLayout('Front-engine, rear-wheel-drive (1985–1988); Front-engine, front-wheel-drive (1988–present)')
    ).toEqual({ positions: ['front'], wheels: ['fwd', 'rwd'] })
  })

  it('reads the Japanese-style layout codes and other languages', () => {
    expect(parseLayout('FF layout; F4 layout')).toEqual({ positions: ['front'], wheels: ['fwd', 'awd'] })
    expect(parseLayout('전륜구동; 4륜구동')).toEqual({ positions: [], wheels: ['fwd', 'awd'] })
    expect(parseLayout('Motor vpředu, pohon předních kol')).toEqual({ positions: ['front'], wheels: ['fwd'] })
    expect(parseLayout('двигун спереду, повний привід')).toEqual({ positions: ['front'], wheels: ['awd'] })
    expect(parseLayout('переднемоторная')).toEqual({ positions: ['front'], wheels: [] })
  })

  it('treats a mid engine as mid, not front', () => {
    expect(parseLayout('Front mid-engine, front-wheel drive').positions).toEqual(['mid'])
  })

  it('returns nothing for text with no layout words', () => {
    expect(parseLayout('See below')).toEqual({ positions: [], wheels: [] })
  })
})

describe('parseGearboxes', () => {
  const entries = (text: string): [string, number[]][] => [...parseGearboxes(text)].map(([k, v]) => [k, v])

  it('collects gear counts per kind across segments', () => {
    expect(entries('5-speed manual; 6-speed manual; 4-speed automatic; 6-speed DSG')).toEqual([
      ['manual', [5, 6]],
      ['automatic', [4]],
      ['dct', [6]]
    ])
  })

  it('reads slash lists, vendor names and CVTs', () => {
    expect(entries('4/5-speed manual; 3/4-speed automatic')).toEqual([
      ['manual', [4, 5]],
      ['automatic', [3, 4]]
    ])
    expect(entries('7-speed or 8-speed Lineartronic CVT; 6-speed manual')).toEqual([
      ['cvt', [7, 8]],
      ['manual', [6]]
    ])
    expect(entries('5-speed 5G-Tronic automatic')).toEqual([['automatic', [5]]])
  })

  it('reads Korean and Russian wording', () => {
    expect(entries('수동 5단(1995년~2010년); 자동 4단; 듀얼 클러치 자동 7단; CVT(2009년~현재)')).toEqual([
      ['manual', [5]],
      ['automatic', [4]],
      ['dct', [7]],
      ['cvt', []]
    ])
    expect(entries('пятиступенчатая механическая, четырёхступенчатая автоматическая или вариатор')).toEqual([
      ['manual', [5]],
      ['automatic', [4]],
      ['cvt', []]
    ])
    expect(entries('4АКПП, 5МКПП')).toEqual([
      ['automatic', [4]],
      ['manual', [5]]
    ])
  })

  it('separates automated manuals and single-speed EV boxes', () => {
    expect(entries('6-speed manual; 6-speed Sequentronic automated manual')).toEqual([
      ['manual', [6]],
      ['amt', [6]]
    ])
    expect(entries('1-speed planetary gear')).toEqual([['single', []]])
  })
})

describe('driveRows', () => {
  it('builds position, wheels and gearbox rows', () => {
    const rows = driveRows('Front-engine, four-wheel-drive', '6-speed manual; 8-speed automatic', t)
    expect(rows.map(r => [r.key, r.value])).toEqual([
      ['enginePosition', 'wikispec.pos.front'],
      ['drivenWheels', 'wikispec.wheels.awd'],
      ['manual', 'wikispec.gears:6'],
      ['automatic', 'wikispec.gears:8']
    ])
  })

  it('finds the drive in the gearbox field', () => {
    const rows = driveRows(null, 'Traction et 4×4', t)
    expect(rows.map(r => [r.key, r.value])).toEqual([['drivenWheels', 'wikispec.wheels.fwd, wikispec.wheels.awd']])
  })

  it('keeps unreadable text on its own row but drops junk', () => {
    expect(driveRows('Mystery layout', 'Hybrid Synergy Drive', t).map(r => r.key)).toEqual(['layout', 'transmission'])
    expect(driveRows(null, 'See below', t)).toEqual([])
    expect(driveRows(null, 'тип = механическая число ступеней = 5', t).map(r => r.key)).toEqual(['manual'])
  })
})
