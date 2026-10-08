import { describe, it, expect } from 'vitest'

import { cleanTitle, modelSlugsIn, parseListingGroups, parseYoutubeIds, yearOf } from './honda-videos-parse.js'

describe('parseYoutubeIds', () => {
  it('finds embed, short and watch links once each', () => {
    const html = `<iframe src="https://www.youtube.com/embed/We44dvqDKiE?rel=0"></iframe>
      <a href="https://youtu.be/We44dvqDKiE">x</a> <a href="https://youtube.com/watch?v=abcdefghijk">y</a>
      <a href="https://youtube.com/@Honda.Ukraine">channel</a>`
    expect(parseYoutubeIds(html)).toEqual(['We44dvqDKiE', 'abcdefghijk'])
  })
})

describe('cleanTitle / yearOf / modelSlugsIn', () => {
  it('strips the site suffix', () => {
    expect(cleanTitle('Чей ГИБРИД круче? RAV4 vs Honda CR-V · Хонда Україна')).toBe(
      'Чей ГИБРИД круче? RAV4 vs Honda CR-V'
    )
  })
  it('reads the model year', () => {
    expect(yearOf('Honda CR-V Hybrid 2020 test drive')).toBe(2020)
    expect(yearOf('Honda Civic')).toBeNull()
  })
  it('names catalog models, not other brands', () => {
    expect(modelSlugsIn(['RAV4 vs Honda CR-V'], ['cr-v', 'civic', 'hr-v', 'e'])).toEqual(['cr-v'])
    expect(modelSlugsIn(['Тест Honda'], ['cr-v', 'civic'])).toEqual([])
  })
})

describe('parseListingGroups', () => {
  it('maps article links to their model heading', () => {
    const html = `<h3 class="centuregothicbold">Прес-огляд  Jazz E:HEV</h3><ul class="uk-list">
      <li><a href="https://honda.ua/press-review/a/">A</a></li><li><a href="https://honda.ua/press-review/b/">B</a></li></ul>
      <h3 class="x">Прес-огляд CR-V Hybrid</h3><ul class="uk-list"><li><a href="https://honda.ua/press-review/c/">C</a></li></ul>
      <h3>No list</h3>`
    expect(parseListingGroups(html)).toEqual([
      { heading: 'Jazz E:HEV', urls: ['https://honda.ua/press-review/a/', 'https://honda.ua/press-review/b/'] },
      { heading: 'CR-V Hybrid', urls: ['https://honda.ua/press-review/c/'] }
    ])
  })
})
