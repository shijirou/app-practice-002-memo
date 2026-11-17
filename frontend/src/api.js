// API（/api/memos）との通信。失敗したときは、画面に出せる 1 文の Error を投げる。
const NETWORK_ERROR = 'サーバーにつながりません。しばらくしてから、もう一度お試しください。'
const UNKNOWN_ERROR = 'エラーが起きました。'

async function request(path, options) {
  let response
  try {
    response = await fetch(path, options)
  } catch {
    throw new Error(NETWORK_ERROR)
  }
  if (!response.ok) {
    // API は失敗を {"message": "..."} で返す（docs/data-design.md）
    let message = UNKNOWN_ERROR
    try {
      const body = await response.json()
      if (typeof body.message === 'string' && body.message) message = body.message
    } catch {
      // 中身が読めないときは、既定の文のまま
    }
    throw new Error(message)
  }
  if (response.status === 204) return null // 削除（中身なし）
  return response.json()
}

export function createMemo(body) {
  return request('/api/memos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
}

// 編集（F4）。本文だけを直す
export function updateMemo(id, body) {
  return request(`/api/memos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
}

// 削除（F5）
export function deleteMemo(id) {
  return request(`/api/memos/${id}`, { method: 'DELETE' })
}

// 一覧（F2）・検索（F3）・重要のみ（F6）。keyword が空なら全件、important が true なら重要だけ。
export function fetchMemos({ keyword = '', important = false } = {}) {
  const params = new URLSearchParams()
  if (keyword) params.set('keyword', keyword)
  if (important) params.set('important', 'true')
  const query = params.toString()
  return request(query ? `/api/memos?${query}` : '/api/memos')
}

// 全体の件数 { total, important }。絞り込みに関係なく、全部の数。
export function fetchCounts() {
  return request('/api/memos/counts')
}

// 重要の付け外し（F6）
export function setImportant(id, important) {
  return request(`/api/memos/${id}/important`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ important }),
  })
}
