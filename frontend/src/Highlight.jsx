// 本文の中の、検索した文字を黄色（<mark>）で目立たせる。
// 文字列を HTML として差し込まず、React の要素に分けて返すので、本文に < などがあっても安全。
export default function Highlight({ text, keyword }) {
  if (!keyword) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 丸かっこで囲むと、split が一致した部分も返す（奇数番目が一致した部分）
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))
}
