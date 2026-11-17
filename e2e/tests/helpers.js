// テストの共通の部品。専用の DB（memo_e2e）のメモを、API で用意したり空にしたりする。

// 専用の DB のメモを、すべて消す（各テストの前に呼ぶ。テストが順番に依存しないようにする）
export async function resetMemos(request) {
  const memos = await (await request.get('/api/memos')).json()
  for (const memo of memos) {
    await request.delete(`/api/memos/${memo.id}`)
  }
}

// API でメモを 1 件作る（古いものから順に呼ぶと、あとのものが一覧の上に来る）
export async function createMemo(request, body) {
  const response = await request.post('/api/memos', { data: { body } })
  return response.json()
}

// 画面の部品の探し方（画面を読み上げる道具と同じ、名前と役割で探す）
export const newMemoBox = (page) => page.getByRole('textbox', { name: '新しいメモの本文' })
export const newMemoSave = (page) => page.getByRole('region', { name: '新しいメモ' }).getByRole('button', { name: '保存' })
export const searchBox = (page) => page.getByRole('searchbox', { name: 'キーワードで検索' })
export const onlyImportantButton = (page) => page.getByRole('button', { name: '重要のみ' })
export const cards = (page) => page.getByRole('article')
export const summary = (page) => page.locator('.result')

// Tab キーだけで、目的の部品までカーソルを動かす（届かなければ失敗）
export async function tabUntilFocused(page, locator, maxTabs = 20) {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab')
    if (await locator.evaluate((el) => el === document.activeElement)) return
  }
  throw new Error(`Tab キーを ${maxTabs} 回押しても、目的の部品に届きませんでした`)
}
