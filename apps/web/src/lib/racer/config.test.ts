import { describe, it, expect } from 'vitest'

import { bodyForKind } from './config'

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
