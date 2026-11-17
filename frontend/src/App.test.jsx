import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { json, memo, mockApi } from './test-api.js'

const textbox = () => screen.getByRole('textbox', { name: '新しいメモの本文' })
const saveButton = () => screen.getByRole('button', { name: '保存' })

describe('一覧（F2）', () => {
  beforeEach(() => {
    // 前のテストで残った選択を消す
    window.getSelection()?.removeAllRanges()
  })

  it('API が返した順に、日時（曜日つき）と本文を表示する', async () => {
    mockApi({ list: [memo(2, '2つ目のメモ'), memo(1, '1つ目のメモ', '2026-11-15T15:30:00Z')] })
    render(<App />)

    expect(await screen.findByText('2つ目のメモ')).toBeInTheDocument()
    const cards = screen.getAllByRole('article')
    expect(cards[0]).toHaveTextContent('2つ目のメモ')
    expect(cards[1]).toHaveTextContent('1つ目のメモ')
    expect(cards[0]).toHaveTextContent('2026-11-16(月) 10:30')
    expect(cards[1]).toHaveTextContent('2026-11-16(月) 00:30')
    expect(screen.getByText('全2件（重要：0件）')).toBeInTheDocument()
  })

  it('メモが 0 件のときは案内を出す', async () => {
    mockApi({ list: [] })
    render(<App />)
    expect(await screen.findByText('メモはまだありません')).toBeInTheDocument()
    expect(screen.getByText('全0件（重要：0件）')).toBeInTheDocument()
  })

  it('一覧の取得に失敗したら、メッセージと再読み込みを出し、押すと読み直す', async () => {
    const user = userEvent.setup()
    let calls = 0
    mockApi({
      list: () => {
        calls += 1
        return calls === 1 ? json({ message: 'エラーが起きました' }, 500) : json([memo(1, '読み直したメモ')])
      },
    })
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('エラーが起きました')
    await user.click(screen.getByRole('button', { name: '再読み込み' }))
    expect(await screen.findByText('読み直したメモ')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('登録（F1）', () => {
  it('保存すると、API に送り、一覧の先頭に出て、入力欄が空になる', async () => {
    const user = userEvent.setup()
    const fetchSpy = mockApi({
      list: [memo(1, '前からあるメモ')],
      post: () => json(memo(2, '新しいメモ'), 201),
    })
    render(<App />)
    await screen.findByText('前からあるメモ')

    await user.type(textbox(), '  新しいメモ  ')
    await user.click(saveButton())

    await waitFor(() => expect(screen.getAllByRole('article')[0]).toHaveTextContent('新しいメモ'))
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByText('全2件（重要：0件）')).toBeInTheDocument()
    expect(textbox()).toHaveValue('')

    const postCall = fetchSpy.mock.calls.find(([, options]) => options?.method === 'POST')
    expect(postCall[0]).toBe('/api/memos')
    expect(JSON.parse(postCall[1].body)).toEqual({ body: '新しいメモ' }) // 前後の空白は取り除く
  })

  it('最初の読み込みに失敗していても、保存すると、前からあるメモも含めて一覧を出し直す', async () => {
    const user = userEvent.setup()
    let calls = 0
    mockApi({
      existing: [memo(1, '前からあるメモ')],
      post: () => json(memo(2, '新しいメモ'), 201),
      list: (store) => {
        calls += 1
        return calls === 1 ? json({ message: 'エラーが起きました' }, 500) : json(store)
      },
    })
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('エラーが起きました')

    await user.type(textbox(), '新しいメモ')
    await user.click(saveButton())

    // 「全1件（新しいメモだけ）」にならず、前からあるメモも見える
    expect(await screen.findByText('前からあるメモ')).toBeInTheDocument()
    expect(screen.getByText('新しいメモ', { selector: '.body' })).toBeInTheDocument()
    expect(screen.getByText('全2件（重要：0件）')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('保存している間に打った続きの文章は、消さない', async () => {
    const user = userEvent.setup()
    let release
    mockApi({
      post: () =>
        new Promise((resolve) => {
          release = () => resolve(json(memo(1, '最初の文章'), 201))
        }),
    })
    render(<App />)
    await screen.findByText('メモはまだありません')

    await user.type(textbox(), '最初の文章')
    await user.click(saveButton()) // 保存中（返事はまだ来ない）
    await user.type(textbox(), '続き')
    release()

    expect(await screen.findByRole('article')).toHaveTextContent('最初の文章')
    expect(textbox()).toHaveValue('最初の文章続き')
  })

  it('1000 文字を超えたら、切り捨てずに知らせ、保存できない', async () => {
    const user = userEvent.setup()
    mockApi()
    render(<App />)
    await screen.findByText('メモはまだありません')

    await user.click(textbox())
    await user.paste('あ'.repeat(1001))

    expect(textbox()).toHaveValue('あ'.repeat(1001)) // 勝手に切り捨てない
    expect(screen.getByText('1001 / 1000 文字')).toBeInTheDocument()
    expect(screen.getByText(/1000 文字を超えています/)).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()

    await user.keyboard('{Backspace}')
    expect(saveButton()).toBeEnabled()
  })

  it('Ctrl+Enter でも保存できる', async () => {
    const user = userEvent.setup()
    mockApi({ post: () => json(memo(1, 'ショートカット'), 201) })
    render(<App />)
    await screen.findByText('メモはまだありません')

    await user.type(textbox(), 'ショートカット')
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(await screen.findByRole('article')).toHaveTextContent('ショートカット')
  })

  it('開いた直後から入力欄にカーソルがある', async () => {
    mockApi()
    render(<App />)
    await screen.findByText('メモはまだありません')
    expect(textbox()).toHaveFocus()
  })

  it('本文が空・空白だけのときは、保存できない', async () => {
    const user = userEvent.setup()
    mockApi()
    render(<App />)
    await screen.findByText('メモはまだありません')

    expect(saveButton()).toBeDisabled()
    await user.type(textbox(), '   ')
    expect(saveButton()).toBeDisabled()
  })

  it('保存に失敗したら、メッセージを出し、書いた文章は消さず、一覧も変えない', async () => {
    const user = userEvent.setup()
    mockApi({
      list: [memo(1, '前からあるメモ')],
      post: () => json({ message: '本文を入力してください' }, 400),
    })
    render(<App />)
    await screen.findByText('前からあるメモ')

    await user.type(textbox(), '書きかけの文章')
    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('本文を入力してください')
    expect(textbox()).toHaveValue('書きかけの文章')
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })

  it('サーバーにつながらないときも、メッセージを出して文章を残す', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      if (options?.method === 'POST') throw new TypeError('Failed to fetch')
      return json([])
    })
    render(<App />)
    await screen.findByText('メモはまだありません')

    await user.type(textbox(), '残したい文章')
    await user.click(saveButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('サーバーにつながりません')
    expect(textbox()).toHaveValue('残したい文章')
  })

  it('文字数は、絵文字も 1 文字と数えて表示する', async () => {
    const user = userEvent.setup()
    mockApi()
    render(<App />)
    await screen.findByText('メモはまだありません')

    await user.type(textbox(), '😀😀あ')
    expect(screen.getByText('3 / 1000 文字')).toBeInTheDocument()
  })
})
