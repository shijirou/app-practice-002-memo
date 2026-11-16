import { useEffect, useRef, useState } from 'react'
import { createMemo, fetchMemos } from './api.js'
import MemoCard from './MemoCard.jsx'
import MemoForm from './MemoForm.jsx'

export default function App() {
  const [memos, setMemos] = useState(null) // null = まだ読み込んでいない
  const [loadError, setLoadError] = useState('')
  // 読み込みの順番の札。古い読み込みの結果が、新しい結果を上書きしないようにする
  const latest = useRef(0)

  // 最初の読み込み（画面が消えたあとに、結果で画面を変えないよう、札で止める）
  useEffect(() => {
    const ticket = ++latest.current
    fetchMemos()
      .then((list) => {
        if (ticket === latest.current) setMemos(list)
      })
      .catch((e) => {
        if (ticket === latest.current) setLoadError(e.message)
      })
    return () => {
      latest.current += 1
    }
  }, [])

  // 一覧を読み直す。失敗しても、すでに表示しているメモは消さない
  async function reload(justCreated) {
    const ticket = ++latest.current
    setLoadError('')
    try {
      const list = await fetchMemos()
      if (ticket === latest.current) setMemos(list)
    } catch (e) {
      if (ticket !== latest.current) return
      setLoadError(e.message)
      // 保存はできているので、いま見えている一覧には、できるだけ足しておく
      if (justCreated) setMemos((prev) => (prev ? [justCreated, ...prev] : prev))
    }
  }

  // 保存したあとは、一覧を読み直す（最初の読み込みに失敗していたときも、古いメモが消えて見えないように）
  async function handleCreate(body) {
    const memo = await createMemo(body)
    await reload(memo)
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
            <button type="button" onClick={() => reload()}>
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
