// 画面のテストで使う、サーバー（API）の代役。
import { vi } from 'vitest'

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export const memo = (id, body, createdAt = '2026-11-16T01:30:00Z') => ({
  id,
  body,
  important: false,
  createdAt,
  updatedAt: createdAt,
})

export const importantMemo = (id, body) => ({ ...memo(id, body), important: true })

// fetch を差し替える。サーバーの代わりに、メモの置き場（store）を持つ。
// GET /api/memos は一覧（keyword・important で絞り込む。list が関数なら、その返事）、
// GET /api/memos/counts は件数、POST は登録（成功したら置き場の先頭に足す）、
// PUT /api/memos/{id} は編集、DELETE /api/memos/{id} は削除、PUT /api/memos/{id}/important は重要の付け外し
// （putMemo・deleteMemo・putImportant で、返事を差し替えられる）。
// existing: 最初からサーバーにあるメモ
export function mockApi({ list, existing = [], post, putImportant, putMemo, deleteMemo } = {}) {
  const store = Array.isArray(list) ? [...list] : [...existing]
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
    const { pathname, searchParams } = new URL(url, 'http://localhost')
    if (options?.method === 'POST') {
      const response = post ? await post(options) : json(memo(99, 'x'), 201)
      if (response.status === 201) store.unshift(await response.clone().json())
      return response
    }
    if (options?.method === 'DELETE') {
      if (deleteMemo) return deleteMemo(pathname, options)
      const index = store.findIndex((m) => pathname === `/api/memos/${m.id}`)
      if (index < 0) return json({ message: 'メモが見つかりません' }, 404)
      store.splice(index, 1)
      return new Response(null, { status: 204 })
    }
    if (options?.method === 'PUT' && !pathname.endsWith('/important')) {
      if (putMemo) return putMemo(pathname, options)
      const target = store.find((m) => pathname === `/api/memos/${m.id}`)
      if (!target) return json({ message: 'メモが見つかりません' }, 404)
      target.body = JSON.parse(options.body).body
      return json(target)
    }
    if (options?.method === 'PUT') {
      if (putImportant) return putImportant(pathname, options)
      const target = store.find((m) => pathname === `/api/memos/${m.id}/important`)
      if (!target) return json({ message: 'メモが見つかりません' }, 404)
      target.important = JSON.parse(options.body).important
      return json(target)
    }
    if (pathname === '/api/memos/counts') {
      return json({ total: store.length, important: store.filter((m) => m.important).length })
    }
    if (typeof list === 'function') return list(store)
    const keyword = (searchParams.get('keyword') ?? '').toLowerCase()
    const onlyImportant = searchParams.get('important') === 'true'
    return json(store.filter((m) => m.body.toLowerCase().includes(keyword) && (!onlyImportant || m.important)))
  })
}
