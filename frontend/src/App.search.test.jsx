import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { importantMemo, json, memo, mockApi } from './test-api.js'

const searchBox = () => screen.getByRole('searchbox', { name: 'キーワードで検索' })
const onlyImportantButton = () => screen.getByRole('button', { name: '重要のみ' })
const textbox = () => screen.getByRole('textbox', { name: '新しいメモの本文' })
const saveButton = () => screen.getByRole('button', { name: '保存' })

describe('検索（F3）', () => {
  it('打つと絞り込み、一致した文字を目立たせ、件数に「表示 n 件」を付ける。空に戻すと全件', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(3, '見積書の再送'), memo(2, '会議室の予約'), memo(1, '見積書を送る')] })
    render(<App />)
    await screen.findByText('会議室の予約')

    await user.type(searchBox(), '見積書')

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2))
    expect(screen.queryByText('会議室の予約')).not.toBeInTheDocument()
    expect(screen.getByText('全3件（重要：0件） ／ 表示 2件')).toBeInTheDocument()
    expect(document.querySelectorAll('mark')).toHaveLength(2)
    expect(document.querySelector('mark')).toHaveTextContent('見積書')

    await user.clear(searchBox())
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3))
    expect(document.querySelectorAll('mark')).toHaveLength(0)
    expect(screen.getByText('全3件（重要：0件）')).toBeInTheDocument()
  })

  it('打つたびには送らず、少し待ってから 1 回だけ送る。送る語は前後の空白なし', async () => {
    const user = userEvent.setup()
    const fetchSpy = mockApi({ list: [memo(1, '見積書')] })
    render(<App />)
    await screen.findByText('見積書')

    await user.type(searchBox(), '  見積書 ')

    await waitFor(() => {
      const urls = fetchSpy.mock.calls.map(([url]) => url)
      expect(urls).toContain('/api/memos?keyword=%E8%A6%8B%E7%A9%8D%E6%9B%B8')
    })
    const searches = fetchSpy.mock.calls.map(([url]) => url).filter((url) => url.includes('keyword='))
    expect(searches).toHaveLength(1)
  })

  it('一致しないときは「見つかりませんでした」を出す（メモが 0 件のときとは別の文）', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(1, '会議室の予約')] })
    render(<App />)
    await screen.findByText('会議室の予約')

    await user.type(searchBox(), '存在しない語')

    expect(await screen.findByText('見つかりませんでした')).toBeInTheDocument()
    expect(screen.getByText('全1件（重要：0件） ／ 表示 0件')).toBeInTheDocument()
    expect(screen.queryByText('メモはまだありません')).not.toBeInTheDocument()
  })

  it('検索語に記号や < があっても、壊れず、本文も HTML として扱わない', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(1, '割引 (50%) <b>太字</b> a.b')] })
    render(<App />)
    await screen.findByText(/割引/)

    await user.type(searchBox(), '(50%) <b>')

    await waitFor(() => expect(document.querySelector('mark')).toHaveTextContent('(50%) <b>'))
    expect(document.querySelector('.body b')).toBeNull() // タグとして描かれていない
    await user.clear(searchBox())
    await user.type(searchBox(), 'a.b')
    await waitFor(() => expect(document.querySelector('mark')).toHaveTextContent('a.b'))
  })

  it('検索中に打ち続けても、入力欄の文字は消えず、カーソルも残る', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(1, '見積書')] })
    render(<App />)
    await screen.findByText('見積書')

    await user.type(searchBox(), '見')
    await screen.findByText('見積書')
    await user.type(searchBox(), '積')

    expect(searchBox()).toHaveValue('見積')
    expect(searchBox()).toHaveFocus()
  })

  it('検索の取得に失敗したら、メッセージを出し、いま見えているメモは消さない', async () => {
    const user = userEvent.setup()
    let fail = false
    mockApi({
      list: () => (fail ? json({ message: 'エラーが起きました' }, 500) : json([memo(1, '消えてはいけないメモ')])),
    })
    render(<App />)
    await screen.findByText('消えてはいけないメモ')

    fail = true
    await user.type(searchBox(), 'a')

    expect(await screen.findByRole('alert')).toHaveTextContent('エラーが起きました')
    expect(screen.getByText('消えてはいけないメモ')).toBeInTheDocument()
  })
})

describe('重要（F6）', () => {
  it('「重要にする」を押すと、印が付き、件数が増える。押し直すと外れる', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(2, '2つ目'), memo(1, '1つ目')] })
    render(<App />)
    await screen.findByText('2つ目')
    expect(screen.getByText('全2件（重要：0件）')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '重要にする' })[1])

    await waitFor(() => expect(screen.getByText('全2件（重要：1件）')).toBeInTheDocument())
    const cards = screen.getAllByRole('article')
    expect(cards[0]).toHaveTextContent('2つ目') // 並び順は変わらない
    expect(cards[1]).toHaveClass('important')
    expect(cards[0]).not.toHaveClass('important')

    await user.click(screen.getByRole('button', { name: '重要を外す' }))
    await waitFor(() => expect(screen.getByText('全2件（重要：0件）')).toBeInTheDocument())
    expect(screen.getAllByRole('article')[1]).not.toHaveClass('important')
  })

  it('重要のボタンを押しても、カードは開閉しない', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(1, '1つ目')] })
    render(<App />)
    await screen.findByText('1つ目')

    await user.click(screen.getByRole('button', { name: '重要にする' }))
    await screen.findByRole('button', { name: '重要を外す' })

    expect(screen.getByRole('article')).not.toHaveClass('open')
  })

  it('「重要のみ」で重要なメモだけになり、押し直すと全件に戻る', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(3, '普通のメモ'), importantMemo(2, '大事なメモ'), memo(1, 'もう一つ')] })
    render(<App />)
    await screen.findByText('普通のメモ')
    expect(onlyImportantButton()).toHaveAttribute('aria-pressed', 'false')

    await user.click(onlyImportantButton())

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByText('大事なメモ')).toBeInTheDocument()
    expect(onlyImportantButton()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('全3件（重要：1件） ／ 表示 1件')).toBeInTheDocument()

    await user.click(onlyImportantButton())
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3))
  })

  it('「重要のみ」の中で重要を外すと、そのメモは一覧から消える', async () => {
    const user = userEvent.setup()
    mockApi({ list: [importantMemo(1, '大事なメモ')] })
    render(<App />)
    await screen.findByText('大事なメモ')
    await user.click(onlyImportantButton())
    await screen.findByRole('button', { name: '重要を外す' })

    await user.click(screen.getByRole('button', { name: '重要を外す' }))

    expect(await screen.findByText('見つかりませんでした')).toBeInTheDocument()
    expect(screen.getByText('全1件（重要：0件） ／ 表示 0件')).toBeInTheDocument()
  })

  it('検索と「重要のみ」を組み合わせられる', async () => {
    const user = userEvent.setup()
    mockApi({ list: [importantMemo(3, '見積書A'), memo(2, '見積書B'), importantMemo(1, '会議室')] })
    render(<App />)
    await screen.findByText('見積書A')

    await user.click(onlyImportantButton())
    await user.type(searchBox(), '見積書')

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1))
    expect(screen.getByRole('article')).toHaveTextContent('見積書A') // 一致した文字は <mark> で分かれる
  })

  it('付け外しに失敗したら、メッセージを出し、表示は変えない', async () => {
    const user = userEvent.setup()
    mockApi({
      list: [memo(1, '1つ目')],
      putImportant: () => json({ message: 'メモが見つかりません' }, 404),
    })
    render(<App />)
    await screen.findByText('1つ目')

    await user.click(screen.getByRole('button', { name: '重要にする' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('メモが見つかりません')
    expect(screen.getByRole('button', { name: '重要にする' })).toBeInTheDocument()
    expect(screen.getByText('全1件（重要：0件）')).toBeInTheDocument()
  })

  it('絞り込み中に保存すると、一覧を同じ絞り込みで読み直す', async () => {
    const user = userEvent.setup()
    mockApi({ list: [memo(1, '見積書')], post: () => json(memo(2, '会議室'), 201) })
    render(<App />)
    await screen.findByText('見積書')
    await user.type(searchBox(), '見積書')
    await waitFor(() => expect(screen.getByText(/表示 1件/)).toBeInTheDocument())

    await user.type(textbox(), '会議室')
    await user.click(saveButton())

    // 検索に合わないので一覧には出ないが、全体の件数は増える
    await waitFor(() => expect(screen.getByText('全2件（重要：0件） ／ 表示 1件')).toBeInTheDocument())
    expect(screen.queryByText('会議室', { selector: '.body' })).not.toBeInTheDocument()
  })
})
