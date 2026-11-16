import { describe, expect, it } from 'vitest'
import { countChars, formatDateTime } from './format.js'

describe('formatDateTime', () => {
  it('日本時間で、曜日つきの形にする', () => {
    // 2026-11-16 は月曜日。UTC の 01:30 は日本時間の 10:30
    expect(formatDateTime('2026-11-16T01:30:00Z')).toBe('2026-11-16(月) 10:30')
  })

  it('日本時間にすると日付が変わる場合も正しい', () => {
    // UTC の 11-15 15:30 は、日本時間では 11-16 の 00:30（日曜ではなく月曜）
    expect(formatDateTime('2026-11-15T15:30:00Z')).toBe('2026-11-16(月) 00:30')
  })

  it('24 時ではなく 00 時と出す', () => {
    expect(formatDateTime('2026-11-16T15:00:00Z')).toBe('2026-11-17(火) 00:00')
  })
})

describe('countChars', () => {
  it('絵文字は 1 文字と数える', () => {
    expect(countChars('😀😀あ')).toBe(3)
  })
})
