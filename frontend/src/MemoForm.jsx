import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { countChars, limitChars } from './format.js'

const MAX_CHARS = 1000

// 新しいメモを書く欄。保存に失敗しても、書いた文章は消さない。
export default function MemoForm({ onCreate }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef(null)

  // 開いた直後からカーソルを入れる（2 操作でも保存できるように）
  useEffect(() => {
    textareaRef.current.focus()
  }, [])

  // 文字が増えたら、入力欄を伸ばす（上限は CSS の max-height。超えたら中でスクロール）
  useLayoutEffect(() => {
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [text])

  const canSave = text.trim().length > 0 && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      await onCreate(text.trim())
      setText('')
      textareaRef.current.focus()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e) {
    if (e.ctrlKey && e.key === 'Enter') save()
  }

  return (
    <section className="panel left" aria-label="新しいメモ">
      <div className="phead">
        <h2>新しいメモ</h2>
        <button type="button" className="primary" disabled={!canSave} onClick={save}>
          保存
        </button>
      </div>
      <textarea
        id="new-memo-body"
        ref={textareaRef}
        value={text}
        placeholder="ここに入力"
        aria-label="新しいメモの本文"
        onChange={(e) => setText(limitChars(e.target.value, MAX_CHARS))}
        onKeyDown={handleKeyDown}
      />
      <div className="under">
        <span>
          {countChars(text)} / {MAX_CHARS} 文字
        </span>
        <span>Ctrl + Enter でも保存</span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
