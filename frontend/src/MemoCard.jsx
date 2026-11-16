import { useLayoutEffect, useRef, useState } from 'react'
import { formatDateTime } from './format.js'

// メモ 1 件。本文は 3 行まで。3 行を超えるときは、カードを押すか「続きを読む」で全文を開く。
export default function MemoCard({ memo }) {
  const [open, setOpen] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const bodyRef = useRef(null)

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!open) setTruncated(el.scrollHeight > el.clientHeight + 1)
  }, [memo.body, open])

  function toggle() {
    // 文字を選択している間は開閉しない（コピーのつもりで閉じてしまわないように）
    if (String(window.getSelection()).length > 0) return
    setOpen((v) => !v)
  }

  return (
    // キーボードの人は、下の「続きを読む」ボタンで同じ操作ができる
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <article className={`card${memo.important ? ' important' : ''}${open ? ' open' : ''}`} onClick={toggle}>
      <div className="head">
        <time className="date" dateTime={memo.createdAt}>
          {formatDateTime(memo.createdAt)}
        </time>
      </div>
      <div className="body" ref={bodyRef}>
        {memo.body}
      </div>
      {(truncated || open) && (
        <button
          type="button"
          className="more"
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
        >
          {open ? '閉じる' : '続きを読む'}
        </button>
      )}
    </article>
  )
}
