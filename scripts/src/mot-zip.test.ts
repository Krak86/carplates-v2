import { Readable } from 'node:stream'

import { describe, it, expect } from 'vitest'

import { columnIndex, forEachCsvLine, splitQuoted } from './mot-zip.js'

const read = async (text: string): Promise<{ header: string[]; rows: string[][] }> => {
  const rows: string[][] = []
  let header: string[] = []
  await forEachCsvLine(
    Readable.from([Buffer.from(text)]),
    h => {
      header = h
    },
    r => rows.push(r)
  )
  return { header, rows }
}

describe('splitQuoted', () => {
  it('splits on commas and unquotes', () => {
    expect(splitQuoted('1,"VOLKSWAGEN","CADDY, MAXI",""')).toEqual(['1', 'VOLKSWAGEN', 'CADDY, MAXI', ''])
  })

  it('keeps a doubled quote as one quote', () => {
    expect(splitQuoted('"a ""b"" c",2')).toEqual(['a "b" c', '2'])
  })
})

describe('forEachCsvLine', () => {
  it('reads the pipe-delimited 2022/23 layout', async () => {
    const { header, rows } = await read('test_id|rfr_id\n1|10\n2|20\n')
    expect(header).toEqual(['test_id', 'rfr_id'])
    expect(rows).toEqual([
      ['1', '10'],
      ['2', '20']
    ])
  })

  it('reads the quoted comma-delimited 2021 layout and skips the repeated header of the next part file', async () => {
    const { header, rows } = await read('"test_id","rfr_id"\n1,"10"\n\n"test_id","rfr_id"\n2,"20"')
    expect(header).toEqual(['test_id', 'rfr_id'])
    expect(rows).toEqual([
      ['1', '10'],
      ['2', '20']
    ])
  })

  it('handles CRLF and a missing final newline', async () => {
    const { rows } = await read('a|b\r\n1|2\r\n3|4')
    expect(rows).toEqual([
      ['1', '2'],
      ['3', '4']
    ])
  })
})

describe('columnIndex', () => {
  it('finds columns by name, not position', () => {
    expect(columnIndex(['b', 'a'], ['a', 'b'])).toEqual({ a: 1, b: 0 })
  })

  it('names the missing column', () => {
    expect(() => columnIndex(['a'], ['z'])).toThrow(/"z" missing/)
  })
})
