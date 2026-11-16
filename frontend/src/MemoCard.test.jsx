import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MemoCard from './MemoCard.jsx'

const memo = { id: 1, body: '長い本文', important: false, createdAt: '2026-11-16T01:30:00Z', updatedAt: '2026-11-16T01:30:00Z' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MemoCard の「続きを読む」', () => {
  it('ウィンドウの幅が変わって 3 行を超えたら出て、収まったら消える', () => {
    // jsdom には、文字の配置を計算する力がないので、高さと「大きさが変わった」通知を、自分で作る
    let resized
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback) {
          resized = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    let overflow = false
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockImplementation(() => (overflow ? 100 : 50))
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(50)

    render(<MemoCard memo={memo} />)
    expect(screen.queryByRole('button', { name: '続きを読む' })).not.toBeInTheDocument()

    overflow = true // 幅がせまくなって、3 行に収まらなくなった
    act(() => resized())
    expect(screen.getByRole('button', { name: '続きを読む' })).toBeInTheDocument()

    overflow = false // 幅が広がって、また収まった
    act(() => resized())
    expect(screen.queryByRole('button', { name: '続きを読む' })).not.toBeInTheDocument()
  })

  it('「続きを読む」を押すと全文が開き、「閉じる」で戻る', async () => {
    const user = userEvent.setup()
    vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(100)
    vi.spyOn(Element.prototype, 'clientHeight', 'get').mockReturnValue(50)

    render(<MemoCard memo={memo} />)
    await user.click(screen.getByRole('button', { name: '続きを読む' }))
    expect(screen.getByRole('article')).toHaveClass('open')

    await user.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.getByRole('article')).not.toHaveClass('open')
  })
})
