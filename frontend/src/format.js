// 日時を「2026-11-16(月) 10:30」の形（日本時間）にする
const parts = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatDateTime(iso) {
  const p = Object.fromEntries(parts.formatToParts(new Date(iso)).map((x) => [x.type, x.value]))
  return `${p.year}-${p.month}-${p.day}(${p.weekday}) ${p.hour}:${p.minute}`
}

// 見た目の 1 文字を 1 と数える（絵文字も 1。API の数え方と同じ）
export function countChars(text) {
  return Array.from(text).length
}

export function limitChars(text, max) {
  const chars = Array.from(text)
  return chars.length > max ? chars.slice(0, max).join('') : text
}
