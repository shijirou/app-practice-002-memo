import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { json, memo, mockApi } from './test-api.js'

const editBox = () => screen.getByRole('textbox', { name: 'メモの本文を編集' })
// 編集中のカードの「保存」（左の新規入力欄にも「保存」があるので、カードの中から探す）
const cardSave = () => within(editBox().closest('article')).getByRole('button', { name: '保存' })
const apiCalls = (fetchSpy, method) =>
  fetchSpy.mock.calls.filter(([, options]) => options?.method === method)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('編集（F4）', () => {
  it('「編集」を押すとその場で入力欄になり、「保存」で本文が変わる（前後の空白は取り除く）', async () => {
    const user = userEvent.setup()
    const fetchSpy = mockApi({ list: [memo(2, '2つ目'), memo(1, '直す前の本文')] })
    render(<App />)
    await screen.findByText('直す前の本文')

    await user.click(within(screen.getAllByRole('article')[1]).getByRole('button', { name: '編集' }))

    expect(editBox()).toHaveValue('直す前の本文')
    expect(editBox()).toHaveFocus()
    expect(screen.getByText('Esc キーで取り消し')).toBeInTheDocument()
    // 「編集」の位置に「保存」が出る
    expect(screen.getAllByRole('button', { name: '編集' })).toHaveLength(1)

    await user.clear(editBox())
    await user.type(editBox(), '  直した後の本文  ')
    await user.click(cardSave())

    expect(await screen.findByText('直した後の本文')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'メモの本文を編集' })).not.toBeInTheDocument()
    const [url, options] = apiCalls(fetchSpy, 'PUT')[0]
    expect(url).toBe('/api/memos/1')
    expect(JSON.parse(options.body)).toEqual({ body: '直した後の本文' })
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('2つ目') // 並び順は変わらない
  })

  it('Ctrl+Enter でも保存できる', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(1, '元の本文')] })
    render(<App />)
    await screen.findByText('元の本文')

    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.type(editBox(), '（追記）')
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(await screen.findByText('元の本文（追記）')).toBeInTheDocument()
  })

  it('Esc で取り消すと、送らずに元の本文に戻る', async () => {
    const user = userEvent.setup()
    const fetchSpy = mockApi({ list: [memo(1, '元の本文')] })
    render(<App />)
    await screen.findByText('元の本文')

    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.type(editBox(), 'やっぱりやめる')
    await user.keyboard('{Escape}')

    expect(screen.getByText('元の本文')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'メモの本文を編集' })).not.toBeInTheDocument()
    expect(apiCalls(fetchSpy, 'PUT')).toHaveLength(0)
    // もう一度「編集」を押すと、元の本文から始まる（取り消した文章は残らない）
    await user.click(screen.getByRole('button', { name: '編集' }))
    expect(editBox()).toHaveValue('元の本文')
  })

  it('本文が空・空白だけなら保存できない。1000 文字を超えたら知らせて保存できない', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(1, '元の本文')] })
    render(<App />)
    await screen.findByText('元の本文')
    await user.click(screen.getByRole('button', { name: '編集' }))
    const card = screen.getByRole('article')
    const save = () => within(card).getByRole('button', { name: '保存' })

    await user.clear(editBox())
    expect(save()).toBeDisabled()
    await user.type(editBox(), '   ')
    expect(save()).toBeDisabled()

    await user.clear(editBox())
    await user.click(editBox())
    await user.paste('あ'.repeat(1001))
    expect(editBox()).toHaveValue('あ'.repeat(1001)) // 勝手に切り捨てない
    expect(screen.getByText(/1000 文字を超えています/)).toBeInTheDocument()
    expect(save()).toBeDisabled()

    await user.keyboard('{Backspace}')
    expect(save()).toBeEnabled()
  })

  it('保存に失敗したら、メッセージを出し、直していた文章は残して編集を続けられる', async () => {
    const user = userEvent.setup()
    mockApi({
      list: [memo(1, '元の本文')],
      putMemo: () => json({ message: 'メモが見つかりません' }, 404),
    })
    render(<App />)
    await screen.findByText('元の本文')

    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.type(editBox(), '（直した）')
    await user.click(cardSave())

    expect(await screen.findByRole('alert')).toHaveTextContent('メモが見つかりません')
    expect(editBox()).toHaveValue('元の本文（直した）')
  })

  it('編集の途中で、一覧が読み直されても（別のメモの操作・新規保存）、書きかけの文章は消えない', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(2, '2つ目'), memo(1, '1つ目')], post: () => json(memo(3, '新しいメモ'), 201) })
    render(<App />)
    await screen.findByText('1つ目')

    await user.click(within(screen.getAllByRole('article')[1]).getByRole('button', { name: '編集' }))
    await user.type(editBox(), '（書きかけ）')

    // 別のメモの「重要にする」→ 一覧が読み直される
    await user.click(within(screen.getAllByRole('article')[0]).getByRole('button', { name: '重要にする' }))
    await screen.findByRole('button', { name: '重要を外す' })
    expect(editBox()).toHaveValue('1つ目（書きかけ）')

    // 左の欄から新規保存 → 一覧が読み直される
    await user.type(screen.getByRole('textbox', { name: '新しいメモの本文' }), '新しいメモ')
    await user.click(screen.getAllByRole('button', { name: '保存' })[0])
    await screen.findByText('新しいメモ', { selector: '.body' })
    expect(editBox()).toHaveValue('1つ目（書きかけ）')
  })

  it('編集中のカードを押しても、全文の開閉はしない', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(1, '元の本文')] })
    render(<App />)
    await screen.findByText('元の本文')
    await user.click(screen.getByRole('button', { name: '編集' }))

    await user.click(editBox())
    await user.click(screen.getByText('Esc キーで取り消し'))

    expect(screen.getByRole('article')).not.toHaveClass('open')
    expect(editBox()).toBeInTheDocument()
  })

  it('検索中に編集して、検索語に合わなくなったメモは、保存後に一覧から外れる', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(2, '見積書B'), memo(1, '見積書A')] })
    render(<App />)
    await screen.findByText('見積書B')
    await user.type(screen.getByRole('searchbox', { name: 'キーワードで検索' }), '見積書')
    await waitFor(() => expect(screen.getByText(/表示 2件/)).toBeInTheDocument())

    await user.click(within(screen.getAllByRole('article')[1]).getByRole('button', { name: '編集' }))
    await user.clear(editBox())
    await user.type(editBox(), '会議室')
    await user.click(cardSave())

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByText('全2件（重要：0件） ／ 表示 1件')).toBeInTheDocument()
  })
})

describe('編集の細かい動き', () => {
  it('日本語の変換中の Esc・Ctrl+Enter では、取り消しも保存もしない', async () => {
    const user = userEvent.setup()
    const fetchSpy = mockApi({ list: [memo(1, '元の本文')] })
    render(<App />)
    await screen.findByText('元の本文')
    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.type(editBox(), '（変換中）')

    fireEvent.keyDown(editBox(), { key: 'Escape', isComposing: true })
    fireEvent.keyDown(editBox(), { key: 'Enter', ctrlKey: true, isComposing: true })

    expect(editBox()).toHaveValue('元の本文（変換中）') // 取り消されていない
    expect(apiCalls(fetchSpy, 'PUT')).toHaveLength(0) // 保存もされていない
  })

  it('文字数の上限は、前後の空白を取り除いたあとで数える（末尾の改行だけで超えない）', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(1, '元の本文')] })
    render(<App />)
    await screen.findByText('元の本文')
    await user.click(screen.getByRole('button', { name: '編集' }))

    await user.clear(editBox())
    await user.click(editBox())
    await user.paste('あ'.repeat(1000) + '\n')

    expect(screen.queryByText(/1000 文字を超えています/)).not.toBeInTheDocument()
    expect(cardSave()).toBeEnabled()
  })

  it('保存できたのに一覧の読み直しに失敗しても、保存した本文は表示する', async () => {
    const user = userEvent.setup()
    let saved = false
    mockApi({
      list: () => (saved ? json({ message: 'エラーが起きました' }, 500) : json([memo(1, '元の本文')])),
      putMemo: () => {
        saved = true
        return json(memo(1, '保存した本文'))
      },
    })
    render(<App />)
    await screen.findByText('元の本文')

    await user.click(screen.getByRole('button', { name: '編集' }))
    await user.clear(editBox())
    await user.type(editBox(), '保存した本文')
    await user.click(cardSave())

    expect(await screen.findByText('保存した本文')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'メモの本文を編集' })).not.toBeInTheDocument()
  })
})

describe('削除（F5）', () => {
  it('確認で OK すると削除され、一覧と件数から消える。確認の文に「元に戻せません」が入る', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const fetchSpy = mockApi({ list: [memo(2, '残すメモ'), memo(1, '消すメモ')] })
    render(<App />)
    await screen.findByText('消すメモ')

    await user.click(within(screen.getAllByRole('article')[1]).getByRole('button', { name: '削除' }))

    await waitFor(() => expect(screen.queryByText('消すメモ')).not.toBeInTheDocument())
    expect(screen.getByText('残すメモ')).toBeInTheDocument()
    expect(screen.getByText('全1件（重要：0件）')).toBeInTheDocument()
    expect(confirmSpy.mock.calls[0][0]).toContain('元に戻せません')
    expect(apiCalls(fetchSpy, 'DELETE')[0][0]).toBe('/api/memos/1')
  })

  it('確認で取り消すと、何も送らず、消えない', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const fetchSpy = mockApi({ list: [memo(1, '消さないメモ')] })
    render(<App />)
    await screen.findByText('消さないメモ')

    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(apiCalls(fetchSpy, 'DELETE')).toHaveLength(0)
    expect(screen.getByText('消さないメモ')).toBeInTheDocument()
  })

  it('最後の 1 件を消すと「メモはまだありません」になる', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockApi({ list: [memo(1, '最後のメモ')] })
    render(<App />)
    await screen.findByText('最後のメモ')

    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(await screen.findByText('メモはまだありません')).toBeInTheDocument()
  })

  it('削除に失敗したら、メッセージを出し、メモは残る', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mockApi({
      list: [memo(1, '消えないメモ')],
      deleteMemo: () => json({ message: 'エラーが起きました' }, 500),
    })
    render(<App />)
    await screen.findByText('消えないメモ')

    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('エラーが起きました')
    expect(screen.getByText('消えないメモ')).toBeInTheDocument()
  })

  it('すでに消えていた（404）ときは、メッセージを出し、一覧を読み直して合わせる', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    let gone = false
    mockApi({
      list: () => json(gone ? [] : [memo(1, '別の画面で消えたメモ')]),
      deleteMemo: () => {
        gone = true
        return json({ message: 'メモが見つかりません' }, 404)
      },
    })
    render(<App />)
    await screen.findByText('別の画面で消えたメモ')

    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('メモが見つかりません')
    await waitFor(() => expect(screen.queryByText('別の画面で消えたメモ')).not.toBeInTheDocument())
  })

  it('削除のボタンを押しても、カードは開閉しない', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mockApi({ list: [memo(1, 'メモ')] })
    render(<App />)
    await screen.findByText('メモ')

    await user.click(screen.getByRole('button', { name: '削除' }))

    expect(screen.getByRole('article')).not.toHaveClass('open')
  })
})
