import { describe, expect, it } from 'vitest'

import { resolveVehicleColor, VEHICLE_COLOR_HEX, VEHICLE_COLOR_SHADOW_HEX, VEHICLE_COLORS } from './vehicleColor.js'

describe('resolveVehicleColor', () => {
  it('maps every real registry color value', () => {
    expect(resolveVehicleColor('СІРИЙ')).toBe('gray')
    expect(resolveVehicleColor('БІЛИЙ')).toBe('white')
    expect(resolveVehicleColor('ЧОРНИЙ')).toBe('black')
    expect(resolveVehicleColor('СИНІЙ')).toBe('blue')
    expect(resolveVehicleColor('ЧЕРВОНИЙ')).toBe('red')
    expect(resolveVehicleColor('ЗЕЛЕНИЙ')).toBe('green')
    expect(resolveVehicleColor('БЕЖЕВИЙ')).toBe('beige')
    expect(resolveVehicleColor('КОРИЧНЕВИЙ')).toBe('brown')
    expect(resolveVehicleColor('ЖОВТИЙ')).toBe('yellow')
    expect(resolveVehicleColor('ФІОЛЕТОВИЙ')).toBe('purple')
  })

  it('collapses both alternate orange spellings onto the same canonical color', () => {
    expect(resolveVehicleColor('ОРАНЖЕВИЙ')).toBe('orange')
    expect(resolveVehicleColor('ПОМАРАНЧЕВИЙ (ОРАНЖЕВИЙ)')).toBe('orange')
    expect(resolveVehicleColor('ЖОВТОГАРЯЧИЙ')).toBe('orange')
  })

  it('returns null for unknown or missing values', () => {
    expect(resolveVehicleColor('НЕВИЗНАЧЕНИЙ')).toBeNull()
    expect(resolveVehicleColor(null)).toBeNull()
    expect(resolveVehicleColor('')).toBeNull()
  })
})

describe('VEHICLE_COLOR_HEX', () => {
  it('has a hex swatch for every canonical color', () => {
    for (const color of VEHICLE_COLORS) {
      expect(VEHICLE_COLOR_HEX[color]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('VEHICLE_COLOR_SHADOW_HEX', () => {
  it('has a darker shadow swatch for every canonical color', () => {
    for (const color of VEHICLE_COLORS) {
      expect(VEHICLE_COLOR_SHADOW_HEX[color]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
