import { useEffect, useState } from 'react'
import { createMemo, fetchMemos } from './api.js'
import MemoCard from './MemoCard.jsx'
import MemoForm from './MemoForm.jsx'

export default function App() {
  const [memos, setMemos] = useState(null) // null = まだ読み込んでいない
  const [loadError, setLoadError] = useState('')

  // 最初の読み込み（画面が消えたあとに、結果で画面を変えないよう、ignore で止める）
  useEffect(() => {
    let ignore = false
    fetchMemos()
      .then((list) => {
        if (!ignore) setMemos(list)
      })
      .catch((e) => {
        if (!ignore) setLoadError(e.message)
      })
    return () => {
      ignore = true
    }
  }, [])

  // 「再読み込み」ボタン。読み込みに失敗しても、すでに表示しているメモは消さない
  async function reload() {
    setLoadError('')
    try {
      setMemos(await fetchMemos())
    } catch (e) {
      setLoadError(e.message)
    }
  }

  async function handleCreate(body) {
    const memo = await createMemo(body)
    setMemos((prev) => [memo, ...(prev ?? [])])
  }

  return (
    <main className="layout">
      <MemoForm onCreate={handleCreate} />

      <section className="panel right" aria-label="メモ一覧">
        <div className="phead">
          <h2>メモ一覧</h2>
        </div>
        <div className="result" aria-live="polite">
          {memos && `全${memos.length}件`}
        </div>
        {loadError && (
          <div className="error" role="alert">
            {loadError}{' '}
            <button type="button" onClick={reload}>
              再読み込み
            </button>
          </div>
        )}
        <div className="list">
          {memos === null && !loadError && <div className="empty">読み込み中…</div>}
          {memos?.length === 0 && <div className="empty">メモはまだありません</div>}
          {memos?.map((memo) => (
            <MemoCard key={memo.id} memo={memo} />
          ))}
        </div>
      </section>
    </main>
  )
}
