import { expect, test } from '@playwright/test'
import {
  cards,
  createMemo,
  newMemoBox,
  newMemoSave,
  onlyImportantButton,
  resetMemos,
  searchBox,
  summary,
  tabUntilFocused,
} from './helpers.js'

// 画面・API・DB をつないだ状態で、実際のブラウザを動かして確かめる。
// メモの内容は、すべて架空。各テストの前に、専用の DB（memo_e2e）のメモを空にする。
test.beforeEach(async ({ request }) => {
  await resetMemos(request)
})

test.describe('登録（F1）と一覧（F2）', () => {
  test('書いて保存すると一覧の先頭に出る。ブラウザを開き直しても、DB に残っている', async ({ page }) => {
    await page.goto('/')
    await expect(newMemoBox(page)).toBeFocused() // 開いた直後から、入力欄にカーソルがある
    await expect(page.getByText('メモはまだありません')).toBeVisible()

    await newMemoBox(page).fill('架空商事の見積書を再送する')
    await newMemoSave(page).click() // 入力 → 保存で、保存まで 2 操作

    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('架空商事の見積書を再送する')
    await expect(summary(page)).toHaveText('全1件（重要：0件）')
    await expect(newMemoBox(page)).toHaveValue('')

    await page.reload() // 画面を開き直しても、DB から読み込まれる
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('架空商事の見積書を再送する')
  })

  test('Ctrl+Enter でも保存でき、新しいメモが上に並ぶ', async ({ page }) => {
    await page.goto('/')
    await newMemoBox(page).fill('1 つ目のメモ（架空）')
    await page.keyboard.press('Control+Enter')
    await expect(cards(page)).toHaveCount(1)

    await newMemoBox(page).fill('2 つ目のメモ（架空）')
    await page.keyboard.press('Control+Enter')
    await expect(cards(page)).toHaveCount(2)
    await expect(cards(page).first()).toContainText('2 つ目のメモ（架空）')
  })

  test('空白だけのときは保存できない。1000 文字を超えると知らせて保存できない', async ({ page }) => {
    await page.goto('/')
    await expect(newMemoSave(page)).toBeDisabled()
    await newMemoBox(page).fill('   ')
    await expect(newMemoSave(page)).toBeDisabled()

    await newMemoBox(page).fill('あ'.repeat(1001))
    await expect(page.getByText(/1000 文字を超えています/)).toBeVisible()
    await expect(newMemoSave(page)).toBeDisabled()

    await newMemoBox(page).fill('あ'.repeat(1000)) // ちょうど 1000 文字なら保存できる
    await expect(newMemoSave(page)).toBeEnabled()
  })
})

test.describe('検索（F3）', () => {
  test('キーワードで絞り込み、一致した文字を目立たせる。空に戻すと全件', async ({ page, request }) => {
    await createMemo(request, '見積書を送る（架空商事）')
    await createMemo(request, '会議室の予約（架空プロジェクト）')
    await createMemo(request, '見積書の再送（架空フーズ）')
    await page.goto('/')
    await expect(cards(page)).toHaveCount(3)

    await searchBox(page).fill('見積書')
    await expect(cards(page)).toHaveCount(2)
    await expect(summary(page)).toHaveText('全3件（重要：0件） ／ 表示 2件')
    await expect(page.locator('mark')).toHaveCount(2)
    await expect(page.locator('mark').first()).toHaveText('見積書')

    await searchBox(page).fill('存在しない語')
    await expect(page.getByText('見つかりませんでした')).toBeVisible()

    await searchBox(page).fill('')
    await expect(cards(page)).toHaveCount(3)
    await expect(page.locator('mark')).toHaveCount(0)
  })

  test('% や _ は、記号ではなく普通の文字として探す', async ({ page, request }) => {
    await createMemo(request, '割引は 50% まで（架空）')
    await createMemo(request, 'file_name の確認（架空）')
    await createMemo(request, 'ふつうのメモ（架空）')
    await page.goto('/')

    await searchBox(page).fill('%')
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('50%')

    await searchBox(page).fill('_')
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('file_name')
  })
})

test.describe('重要（F6）', () => {
  test('重要の付け外しで件数が変わり、「重要のみ」で絞り込める。画面を開き直しても残る', async ({ page, request }) => {
    await createMemo(request, '普通のメモ（架空）')
    await createMemo(request, '大事なメモ（架空）')
    await page.goto('/')
    await expect(summary(page)).toHaveText('全2件（重要：0件）')

    await cards(page).first().getByRole('button', { name: '重要にする' }).click() // 一番上 = 大事なメモ
    await expect(summary(page)).toHaveText('全2件（重要：1件）')
    await expect(cards(page).first()).toHaveClass(/important/)

    await onlyImportantButton(page).click()
    await expect(onlyImportantButton(page)).toHaveAttribute('aria-pressed', 'true')
    await expect(cards(page)).toHaveCount(1)
    await expect(summary(page)).toHaveText('全2件（重要：1件） ／ 表示 1件')

    await page.reload() // 印は DB に残っている
    await onlyImportantButton(page).click()
    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('大事なメモ')

    // 「重要のみ」の中で重要を外すと、そのメモは一覧から消える
    await cards(page).first().getByRole('button', { name: '重要を外す' }).click()
    await expect(page.getByText('見つかりませんでした')).toBeVisible()
    await expect(summary(page)).toHaveText('全2件（重要：0件） ／ 表示 0件')
  })

  test('検索と「重要のみ」を組み合わせられる', async ({ page, request }) => {
    await createMemo(request, '会議室（架空）')
    await createMemo(request, '見積書 B（架空）')
    await createMemo(request, '見積書 A（架空）')
    await page.goto('/')
    await cards(page).first().getByRole('button', { name: '重要にする' }).click() // 見積書 A

    await onlyImportantButton(page).click()
    await searchBox(page).fill('見積書')

    await expect(cards(page)).toHaveCount(1)
    await expect(cards(page).first()).toContainText('見積書 A')
  })
})

test.describe('編集（F4）', () => {
  test('「編集」で本文を直して保存できる。画面を開き直しても反映されている', async ({ page, request }) => {
    await createMemo(request, '直す前の本文（架空）')
    await page.goto('/')

    await cards(page).first().getByRole('button', { name: '編集' }).click()
    const editBox = page.getByRole('textbox', { name: 'メモの本文を編集' })
    await expect(editBox).toBeFocused()
    await expect(editBox).toHaveValue('直す前の本文（架空）')

    await editBox.fill('直した後の本文（架空）')
    await cards(page).first().getByRole('button', { name: '保存' }).click()

    await expect(cards(page).first()).toContainText('直した後の本文（架空）')
    await expect(editBox).toHaveCount(0)
    await page.reload()
    await expect(cards(page).first()).toContainText('直した後の本文（架空）')
  })

  test('Esc で取り消すと、元の本文に戻り、DB は変わらない', async ({ page, request }) => {
    await createMemo(request, '元の本文（架空）')
    await page.goto('/')

    await cards(page).first().getByRole('button', { name: '編集' }).click()
    await page.getByRole('textbox', { name: 'メモの本文を編集' }).fill('やっぱりやめる')
    await page.keyboard.press('Escape')

    await expect(cards(page).first()).toContainText('元の本文（架空）')
    await page.reload()
    await expect(cards(page).first()).toContainText('元の本文（架空）')
  })

  test('編集の途中で、別のメモの操作をしても、書きかけの文章は消えない', async ({ page, request }) => {
    await createMemo(request, '下のメモ（架空）')
    await createMemo(request, '上のメモ（架空）')
    await page.goto('/')

    await cards(page).nth(1).getByRole('button', { name: '編集' }).click() // 下のメモを編集
    const editBox = page.getByRole('textbox', { name: 'メモの本文を編集' })
    await editBox.press('End')
    await page.keyboard.type('（書きかけ）')

    await cards(page).first().getByRole('button', { name: '重要にする' }).click() // 上のメモを操作 → 一覧が読み直される
    await expect(summary(page)).toHaveText('全2件（重要：1件）')
    await expect(editBox).toHaveValue('下のメモ（架空）（書きかけ）')
  })
})

test.describe('削除（F5）', () => {
  test('確認で OK すると消え、件数にも反映される。取り消すと消えない', async ({ page, request }) => {
    await createMemo(request, '消すメモ（架空）')
    await createMemo(request, '残すメモ（架空）')
    await page.goto('/')

    // 取り消し: 確認で「キャンセル」すると、消えない
    page.once('dialog', (dialog) => dialog.dismiss())
    await cards(page).nth(1).getByRole('button', { name: '削除' }).click()
    await expect(cards(page)).toHaveCount(2)

    // OK: 確認の文に「元に戻せません」が入り、消える
    let message = ''
    page.once('dialog', (dialog) => {
      message = dialog.message()
      return dialog.accept()
    })
    await cards(page).nth(1).getByRole('button', { name: '削除' }).click()
    await expect(cards(page)).toHaveCount(1)
    expect(message).toContain('元に戻せません')
    await expect(cards(page).first()).toContainText('残すメモ（架空）')
    await expect(summary(page)).toHaveText('全1件（重要：0件）')

    await page.reload()
    await expect(cards(page)).toHaveCount(1)
  })

  test('最後の 1 件を消すと、「メモはまだありません」になる', async ({ page, request }) => {
    await createMemo(request, '最後のメモ（架空）')
    await page.goto('/')
    page.once('dialog', (dialog) => dialog.accept())
    await cards(page).first().getByRole('button', { name: '削除' }).click()
    await expect(page.getByText('メモはまだありません')).toBeVisible()
  })
})

test.describe('キーボードだけの操作', () => {
  test('Tab・Enter・Ctrl+Enter だけで、編集・保存・削除まで通しでできる', async ({ page, request }) => {
    await createMemo(request, 'キーボードで直すメモ（架空）')
    await page.goto('/')
    await expect(newMemoBox(page)).toBeFocused()

    // Tab で「編集」まで進み、Enter で編集を始める
    const card = cards(page).first()
    const editButton = card.getByRole('button', { name: '編集' })
    await tabUntilFocused(page, editButton)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('textbox', { name: 'メモの本文を編集' })).toBeFocused()

    // 追記して、Ctrl+Enter で保存する。保存したら、カーソルが「編集」ボタンに戻る
    await page.keyboard.type('（追記）')
    await page.keyboard.press('Control+Enter')
    await expect(card).toContainText('キーボードで直すメモ（架空）（追記）')
    await expect(editButton).toBeFocused()

    // 次の Tab で「削除」に進み、Enter → 確認で OK
    await page.keyboard.press('Tab')
    await expect(card.getByRole('button', { name: '削除' })).toBeFocused()
    page.once('dialog', (dialog) => dialog.accept())
    await page.keyboard.press('Enter')
    await expect(page.getByText('メモはまだありません')).toBeVisible()
  })
})
