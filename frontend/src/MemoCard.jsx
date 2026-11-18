import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { countChars, formatDateTime } from './format.js'
import Highlight from './Highlight.jsx'

const MAX_CHARS = 1000

// メモ 1 件。本文は 3 行まで。3 行を超えるときは、カードを押すか「続きを読む」で全文を開く。
// 「編集」を押すと、そのカードが入力欄に変わる。書きかけの文章はこのカードの中に持つので、
// 一覧が読み直されても（検索・別のメモの操作など）消えない。
export default function MemoCard({ memo, keyword = '', onToggleImportant, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false) // 削除の処理中は削除ボタンを押せなくする（連打で 404 にならないように）
  const bodyRef = useRef(null)
  const textareaRef = useRef(null)
  const editButtonRef = useRef(null)
  const returnFocus = useRef(false) // 編集を終えたとき、「編集」ボタンにカーソルを戻すか

  // 3 行で切れているかを調べる。本文が変わったときだけでなく、
  // ウィンドウの幅の変化・文字の読み込み（フォントの切り替わり）でも調べ直す
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (open || editing || !el) return undefined
    let cancelled = false
    const measure = () => {
      if (!cancelled) setTruncated(el.scrollHeight > el.clientHeight + 1)
    }
    measure()
    document.fonts?.ready.then(measure)
    if (typeof ResizeObserver === 'undefined') return () => (cancelled = true)
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [memo.body, open, editing])

  // 編集を始めた直後だけ、入力欄にカーソルを入れる（打っている途中で奪わない）
  useEffect(() => {
    if (editing) {
      const el = textareaRef.current
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  // 編集を終えたら、「編集」ボタンにカーソルを戻す（ボタンが作り直されて、キーボードの位置が失われないように）
  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false
      editButtonRef.current?.focus()
    }
  }, [editing])

  // 文字が増えたら、入力欄を伸ばす（上限は CSS の max-height。超えたら中でスクロール）
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!editing || !el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [draft, editing])

  function toggle() {
    // 編集中・文字を選択している間は開閉しない（コピーのつもりで閉じてしまわないように）
    if (editing || String(window.getSelection()).length > 0) return
    setOpen((v) => !v)
  }

  function startEdit() {
    setDraft(memo.body)
    setError('')
    setEditing(true)
  }

  function cancelEdit() {
    // 書きかけがあるときだけ、捨てていいか確かめる（変えていなければ、そのまま閉じる）
    if (draft !== memo.body && !window.confirm('編集中の内容を破棄しますか？')) return
    returnFocus.current = true
    setEditing(false)
    setError('')
  }

  // 文字数は、前後の空白を取り除いたあとで数える（API と同じ）
  const count = countChars(draft.trim())
  const overLimit = count > MAX_CHARS
  const canSave = draft.trim().length > 0 && !overLimit && !saving

  async function saveEdit() {
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      await onUpdate(memo, draft.trim())
      returnFocus.current = true
      setEditing(false)
    } catch (e) {
      // 失敗しても、直していた文章は消さない
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e) {
    // 日本語の変換中（確定前）の Esc・Enter は、変換のための操作。取り消しや保存にしない
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Escape') cancelEdit()
    else if (e.ctrlKey && e.key === 'Enter') saveEdit()
  }

  async function handleDelete() {
    if (deleting || !window.confirm('このメモを削除しますか？\n削除すると元に戻せません。')) return
    setDeleting(true)
    try {
      await onDelete(memo)
    } finally {
      setDeleting(false)
    }
  }

  const classes = `card${memo.important ? ' important' : ''}${open ? ' open' : ''}${editing ? ' editing' : ''}`

  return (
    // キーボードの人は、下の「続きを読む」ボタンで同じ操作ができる
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <article className={classes} onClick={toggle}>
      <div className="head">
        <time className="date" dateTime={memo.createdAt}>
          {formatDateTime(memo.createdAt)}
        </time>
        {editing ? (
          <>
            {/* 編集中も、ほかのボタンの場所は空けておく（「保存」の位置が動かないように） */}
            <button type="button" className="imp gap" tabIndex={-1} aria-hidden="true">
              {memo.important ? '重要を外す' : '重要にする'}
            </button>
            <button type="button" className="savebtn" disabled={!canSave} onClick={saveEdit}>
              保存
            </button>
            <button type="button" className="del gap" tabIndex={-1} aria-hidden="true">
              削除
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="imp"
              disabled={!onToggleImportant}
              onClick={(e) => {
                e.stopPropagation() // カードの開閉は動かさない
                onToggleImportant(memo)
              }}
            >
              {memo.important ? '重要を外す' : '重要にする'}
            </button>
            <button
              type="button"
              className="edit"
              ref={editButtonRef}
              disabled={!onUpdate}
              onClick={(e) => {
                e.stopPropagation()
                startEdit()
              }}
            >
              編集
            </button>
            <button
              type="button"
              className="del"
              disabled={!onDelete || deleting}
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
            >
              削除
            </button>
          </>
        )}
      </div>
      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            value={draft}
            aria-label="メモの本文を編集"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
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
          <div className="esc">Esc キーで取り消し</div>
        </>
      ) : (
        <>
          <div className="body" ref={bodyRef}>
            <Highlight text={memo.body} keyword={keyword} />
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
        </>
      )}
    </article>
  )
}
