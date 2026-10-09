import { describe, it, expect } from 'vitest'

import { dedupeModels, groupHazards, parseCampaign, parseCampaignModel, parseRdwDate } from './rdw-recalls-parse.js'

describe('parseRdwDate', () => {
  it('turns compact dates into ISO', () => expect(parseRdwDate('20071106')).toBe('2007-11-06'))
  it.each(['', '0', '2007', '20071306', '20070231', undefined])('rejects %s', v => expect(parseRdwDate(v)).toBeNull())
})

describe('parseCampaign', () => {
  const rec = {
    referentiecode_rdw: 'MGP070060',
    publicatiedatum_rdw: '20130328',
    meldende_producent_distributeur: 'Louwman',
    omschrijving_defect: ' Bouten ',
    meer_informatie_op_internet: '(Nog) niet bekend',
    totaal_aantal_voertuigen_terugroepactie: '7500',
    nationaal_opgegeven_aantal_voertuigen_terugroepactie: ''
  }

  it('maps the fields and cleans empty / placeholder values', () => {
    expect(parseCampaign(rec, ['Brand'])).toMatchObject({
      referenceCode: 'MGP070060',
      publishedAt: '2013-03-28',
      defect: 'Bouten',
      moreInfoUrl: null,
      hazards: ['Brand'],
      vehiclesTotal: 7500,
      vehiclesNational: null
    })
  })

  it('keeps a real link and drops a row without a code', () => {
    expect(parseCampaign({ ...rec, meer_informatie_op_internet: 'https://x.nl/a' }, [])?.moreInfoUrl).toBe(
      'https://x.nl/a'
    )
    expect(parseCampaign({}, [])).toBeNull()
  })
})

describe('parseCampaignModel / dedupeModels', () => {
  it('keys the make and type like the specs table', () => {
    const row = parseCampaignModel({ referentiecode_rdw: 'A', merk: 'VOLKSWAGEN', type: 'GOLF' })
    expect(row).toMatchObject({ referenceCode: 'A', make: 'VOLKSWAGEN', model: 'GOLF' })
    expect(row?.makeKey).toBeTruthy()
  })

  it('skips incomplete rows and collapses same-key spellings', () => {
    expect(parseCampaignModel({ referentiecode_rdw: 'A', merk: 'X' })).toBeNull()
    const a = parseCampaignModel({ referentiecode_rdw: 'A', merk: 'MAZDA', type: 'MAZDA6' })!
    const dup = { ...a, model: 'MAZDA 6' }
    expect(dedupeModels([a, dup])).toHaveLength(1)
  })
})

describe('groupHazards', () => {
  it('collects distinct texts per campaign', () => {
    const map = groupHazards([
      { referentiecode_rdw: 'A', mogelijk_gevaar: 'Brand' },
      { referentiecode_rdw: 'A', mogelijk_gevaar: 'Brand' },
      { referentiecode_rdw: 'A', mogelijk_gevaar: 'Ongeval' },
      { referentiecode_rdw: 'B', mogelijk_gevaar: '' }
    ])
    expect(map.get('A')).toEqual(['Brand', 'Ongeval'])
    expect(map.has('B')).toBe(false)
  })
})
