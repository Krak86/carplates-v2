import { describe, it, expect } from 'vitest'

import {
  TEST_DRIVE_KM,
  activeMode,
  bodyForKind,
  decodeRaceConfig,
  driveProgress,
  encodeRaceConfig,
  type RacerConfig
} from './config'

describe('bodyForKind', () => {
  it('picks special vehicles from the registry body text', () => {
    expect(bodyForKind('specialized', 'ПОЖЕЖНИЙ-C')).toBe('firetruck')
    expect(bodyForKind('specialized', 'СПЕЦІАЛІЗОВАНИЙ МЕДДОПОМОГА-B')).toBe('ambulance')
    expect(bodyForKind('truck', 'СМІТТЄВОЗ-C')).toBe('garbage')
  })

  it('maps passenger body shapes and falls back to kind', () => {
    expect(bodyForKind('passenger', 'ХЕТЧБЕК')).toBe('hatch')
    expect(bodyForKind('truck', 'ПІКАП-B')).toBe('pickup')
    expect(bodyForKind('truck', 'ФУРГОН')).toBe('pickup')
    expect(bodyForKind('motorcycle', null)).toBe('moto')
    expect(bodyForKind('passenger', 'СЕДАН')).toBe('sedan')
    expect(bodyForKind(null)).toBe('sedan')
  })
})

describe('race share token', () => {
  const base: RacerConfig = {
    color: '#aabbcc',
    body: 'sport',
    scenery: 'night',
    backdrop: 'forest',
    lanes: 4,
    traffic: 'many',
    quality: 'high',
    plate: 'CARS UA',
    region: 'м. Київ',
    brand: null,
    auto: true,
    view: 'cockpit'
  }

  it('round-trips every shared setting including the camera view', () => {
    const { plate, region, brand, ...shared } = base
    expect(decodeRaceConfig(encodeRaceConfig(base))).toEqual(shared)
    expect([plate, region, brand]).toHaveLength(3)
  })

  it('still reads a token from before the view existed', () => {
    const old = encodeRaceConfig(base).split('-').slice(0, 8).join('-')
    expect(decodeRaceConfig(old).view).toBeUndefined()
    expect(decodeRaceConfig(`${old}-nope`).view).toBeUndefined()
  })
})

describe('modes and progress', () => {
  it('recognises the presets from lanes and traffic', () => {
    expect(activeMode({ lanes: 2, traffic: 'few' })).toBe('relax')
    expect(activeMode({ lanes: 4, traffic: 'many' })).toBe('hardcore')
    expect(activeMode({ lanes: 3, traffic: 'normal' })).toBeNull()
  })

  it('clamps the drive progress to 0-1', () => {
    expect(driveProgress(-1)).toBe(0)
    expect(driveProgress(TEST_DRIVE_KM / 2)).toBe(0.5)
    expect(driveProgress(TEST_DRIVE_KM * 3)).toBe(1)
  })
})
