import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { countChars } from './format.js'

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

  const count = countChars(text)
  const overLimit = count > MAX_CHARS
  const canSave = text.trim().length > 0 && !overLimit && !saving

  async function save() {
    if (!canSave) return
    const sent = text.trim()
    setSaving(true)
    setError('')
    try {
      await onCreate(sent)
      // 保存中に続きを打っていたら、その文章は消さない（送った文章のままのときだけ空にする）
      setText((current) => (current.trim() === sent ? '' : current))
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
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="under">
        <span className={overLimit ? 'over' : undefined}>
          {count} / {MAX_CHARS} 文字
        </span>
        <span>Ctrl + Enter でも保存</span>
      </div>
      {/* 貼り付けなどで上限を超えても、勝手に切り捨てない。減らすまで保存できない */}
      {overLimit && (
        <p className="error">
          {MAX_CHARS} 文字を超えています。{count - MAX_CHARS} 文字減らすと保存できます。
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
