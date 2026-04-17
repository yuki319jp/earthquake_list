import { describe, expect, it } from 'vitest'
import { extractPublisher, nullableNumber, parseP2PTime, parseQuake } from './quake.js'

describe('backend quake helpers', () => {
  it('P2P 時刻を JST 付き ISO 文字列に変換できる', () => {
    expect(parseP2PTime('2026/04/17 12:34:56').toISOString()).toBe('2026-04-17T03:34:56.000Z')
  })

  it('負の数値を null に変換する', () => {
    expect(nullableNumber(-1)).toBeNull()
    expect(nullableNumber(10)).toBe(10)
  })

  it('quake payload を正規化してパースできる', () => {
    const quake = parseQuake({
      id: '20260417123456',
      code: 551,
      issue: {
        time: '2026/04/17 12:35:00',
        source: { name: '気象庁' }
      },
      earthquake: {
        time: '2026/04/17 12:34:56',
        maxScale: 40,
        domesticTsunami: 'None',
        foreignTsunami: 'None',
        hypocenter: {
          name: '福島県沖',
          magnitude: 5.4,
          depth: 50,
          latitude: 37.1,
          longitude: 141.2
        }
      }
    })

    expect(quake.place).toBe('福島県沖')
    expect(quake.issueTime).toBe('2026-04-17T03:35:00.000Z')
    expect(quake.earthquakeTime).toBe('2026-04-17T03:34:56.000Z')
    expect(quake.magnitude).toBe(5.4)
  })

  it('publisher を複数の形式から抽出できる', () => {
    expect(extractPublisher({ issue: { source: '気象庁' } })).toBe('気象庁')
    expect(extractPublisher({ issue: { source: { name: 'JMA' } } })).toBe('JMA')
    expect(extractPublisher({ issue: { publisher: '発表機関' } })).toBe('発表機関')
    expect(extractPublisher({ issue: { sender: '送信元' } })).toBe('送信元')
    expect(extractPublisher({ issue: {} })).toBeNull()
  })
})
