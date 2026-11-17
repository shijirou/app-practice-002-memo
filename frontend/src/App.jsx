import { useEffect, useRef, useState } from 'react'
import { createMemo, deleteMemo, fetchCounts, fetchMemos, setImportant, updateMemo } from './api.js'
import MemoCard from './MemoCard.jsx'
import MemoForm from './MemoForm.jsx'

// 検索欄に打ってから、API に問い合わせるまでの待ち時間（打つたびに問い合わせないため）
const SEARCH_DELAY_MS = 250

const isFiltered = (filter) => Boolean(filter.keyword) || filter.important

export default function App() {
  // 表示している一覧と、それを取ったときの絞り込み。null = まだ読み込んでいない
  const [result, setResult] = useState(null)
  const [counts, setCounts] = useState(null) // { total, important }。絞り込みに関係なく全体の数
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')

  const [keywordInput, setKeywordInput] = useState('') // 検索欄に打った文字
  const [keyword, setKeyword] = useState('') // 少し待ってから、API に送る文字（前後の空白なし）
  const [onlyImportant, setOnlyImportant] = useState(false)

  // 読み込みの順番の札。古い読み込みの結果が、新しい結果を上書きしないようにする
  const latest = useRef(0)

  // 打つのをやめて少し経ったら、検索語を確定する
  useEffect(() => {
    const timer = setTimeout(() => setKeyword(keywordInput.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [keywordInput])

  // 件数だけ失敗しても、一覧は出す（件数は前の値のまま）。一覧の失敗は、そのまま失敗として扱う
  const fetchAll = (filter) => Promise.all([fetchMemos(filter), fetchCounts().catch(() => null)])

  function showLoaded(filter, [memos, newCounts]) {
    setLoadError('')
    setResult({ memos, keyword: filter.keyword, filtered: isFiltered(filter) })
    if (newCounts) setCounts(newCounts)
  }

  // 読み込みに失敗したら、メッセージを出す。すでに表示しているメモは消さない。
  // justCreated: 保存したばかりのメモ（絞り込んでいないときは、見えている一覧に足しておく）
  function showLoadFailed(filter, e, justCreated) {
    setLoadError(e.message)
    if (justCreated && !isFiltered(filter)) {
      setResult((prev) => (prev ? { ...prev, memos: [justCreated, ...prev.memos] } : prev))
    }
  }

  // 一覧と件数を読み直す（保存・重要の付け外し・「再読み込み」のあと）
  async function load(filter, justCreated) {
    const ticket = ++latest.current
    try {
      const data = await fetchAll(filter)
      if (ticket === latest.current) showLoaded(filter, data)
    } catch (e) {
      if (ticket === latest.current) showLoadFailed(filter, e, justCreated)
    }
  }

  // 検索語・「重要のみ」が変わったら、読み込む（最初の 1 回も同じ）。
  // 画面が消えたあとに、結果で画面を変えないよう、札で止める
  useEffect(() => {
    const ticket = ++latest.current
    const filter = { keyword, important: onlyImportant }
    fetchAll(filter)
      .then((data) => {
        if (ticket === latest.current) showLoaded(filter, data)
      })
      .catch((e) => {
        if (ticket === latest.current) showLoadFailed(filter, e)
      })
    return () => {
      latest.current += 1
    }
  }, [keyword, onlyImportant])

  const reload = (justCreated) => load({ keyword, important: onlyImportant }, justCreated)

  // 保存したあとは、一覧を読み直す（最初の読み込みに失敗していたときも、古いメモが消えて見えないように）
  async function handleCreate(body) {
    const memo = await createMemo(body)
    await reload(memo)
  }

  // 編集の保存。失敗したら例外のまま返す（カードが、書いた文章を残してメッセージを出す）
  async function handleUpdate(memo, body) {
    const updated = await updateMemo(memo.id, body)
    // 読み直しに失敗しても、保存した本文は見えるように、先に一覧へ反映しておく
    setResult((prev) =>
      prev ? { ...prev, memos: prev.memos.map((m) => (m.id === updated.id ? updated : m)) } : prev,
    )
    await reload()
  }

  // 削除（確認はカード側で済んでいる）。すでに消えていた（404）ときも、読み直して一覧を合わせる
  async function handleDelete(memo) {
    setActionError('')
    try {
      await deleteMemo(memo.id)
    } catch (e) {
      setActionError(e.message)
    }
    await reload()
  }

  async function handleToggleImportant(memo) {
    setActionError('')
    try {
      await setImportant(memo.id, !memo.important)
    } catch (e) {
      setActionError(e.message)
      return
    }
    await reload()
  }

  const memos = result?.memos
  let countText = ''
  if (counts) {
    countText = `全${counts.total}件（重要：${counts.important}件）`
    if (result?.filtered) countText += ` ／ 表示 ${memos.length}件`
  }

  return (
    <main className="layout">
      <MemoForm onCreate={handleCreate} />

      <section className="panel right" aria-label="メモ一覧">
        <div className="phead">
          <h2>検索</h2>
        </div>
        <div className="searchrow">
          <input
            type="search"
            placeholder="キーワード"
            aria-label="キーワードで検索"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
          />
          <button
            type="button"
            className="only-important"
            aria-pressed={onlyImportant}
            title="重要なメモだけ表示"
            onClick={() => setOnlyImportant((v) => !v)}
          >
            重要のみ
          </button>
        </div>
        <div className="result" aria-live="polite">
          {countText}
        </div>
        {loadError && (
          <div className="error" role="alert">
            {loadError}{' '}
            <button type="button" onClick={() => reload()}>
              再読み込み
            </button>
          </div>
        )}
        {actionError && (
          <div className="error" role="alert">
            {actionError}
          </div>
        )}
        <div className="list">
          {memos === undefined && !loadError && <div className="empty">読み込み中…</div>}
          {memos?.length === 0 && (
            <div className="empty">{result.filtered ? '見つかりませんでした' : 'メモはまだありません'}</div>
          )}
          {memos?.map((memo) => (
            <MemoCard
              key={memo.id}
              memo={memo}
              keyword={result.keyword}
              onToggleImportant={handleToggleImportant}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
