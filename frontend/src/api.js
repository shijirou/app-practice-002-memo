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
  return response.json()
}

export function fetchMemos() {
  return request('/api/memos')
}

export function createMemo(body) {
  return request('/api/memos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
}
