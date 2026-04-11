import { enableDrag, applyPosition, getPosition, snap, SNAP_GRID, isMobile } from '../src/layout.js'

/**
 * マウスイベントを発火するヘルパー
 */
function fireMouseDown(target, clientX, clientY) {
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX, clientY }))
}
function fireMouseMove(clientX, clientY) {
  document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }))
}
function fireMouseUp() {
  document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

describe('enableDrag', () => {
  let el

  beforeEach(() => {
    el = document.createElement('div')
    el.style.left = '28px'
    el.style.top = '28px'
    document.body.appendChild(el)
  })

  afterEach(() => {
    el.remove()
  })

  it('mousedown→mousemove→mouseupで位置変更しonMoveがend時のみ呼ばれる', () => {
    const onMove = vi.fn()
    enableDrag(el, onMove)

    fireMouseDown(el, 100, 100)
    expect(onMove).not.toHaveBeenCalled() // move中はまだ呼ばれない

    fireMouseMove(156, 128)
    expect(onMove).not.toHaveBeenCalled() // move中はまだ呼ばれない

    fireMouseUp()
    // end時にスナップされた座標でonMoveが呼ばれる
    expect(onMove).toHaveBeenCalledTimes(1)
    const [x, y] = onMove.mock.calls[0]
    // スナップされた値（SNAP_GRID=28の倍数）
    expect(x % SNAP_GRID).toBe(0)
    expect(y % SNAP_GRID).toBe(0)
  })

  it('ドラッグ中にdraggingクラスが付与され、mouseupで除去', () => {
    enableDrag(el, vi.fn())

    fireMouseDown(el, 0, 0)
    expect(el.classList.contains('dragging')).toBe(true)

    fireMouseUp()
    expect(el.classList.contains('dragging')).toBe(false)
  })

  it('.no-dragクラスの子要素からはドラッグ開始しない', () => {
    const onMove = vi.fn()
    enableDrag(el, onMove)

    const child = document.createElement('button')
    child.classList.add('no-drag')
    el.appendChild(child)

    fireMouseDown(child, 100, 100)
    fireMouseMove(200, 200)
    fireMouseUp()

    expect(onMove).not.toHaveBeenCalled()
    expect(el.classList.contains('dragging')).toBe(false)
  })

  it('負座標にならない(Math.max(0))', () => {
    el.style.left = '5px'
    el.style.top = '5px'
    enableDrag(el, vi.fn())

    fireMouseDown(el, 100, 100)
    fireMouseMove(0, 0)  // -95, -95 になるが 0 にクランプ
    fireMouseUp()

    expect(el.style.left).toBe('0px')
    expect(el.style.top).toBe('0px')
  })

  it('onMove省略でも例外なし', () => {
    enableDrag(el)

    expect(() => {
      fireMouseDown(el, 100, 100)
      fireMouseMove(150, 150)
      fireMouseUp()
    }).not.toThrow()
  })

  it('destroy()後はmousedownしてもドラッグ開始しない', () => {
    const onMove = vi.fn()
    const { destroy } = enableDrag(el, onMove)

    destroy()

    fireMouseDown(el, 100, 100)
    fireMouseMove(200, 200)
    fireMouseUp()

    expect(onMove).not.toHaveBeenCalled()
    expect(el.classList.contains('dragging')).toBe(false)
  })

  it('ドラッグ終了時にグリッドスナップされる', () => {
    const onMove = vi.fn()
    enableDrag(el, onMove)

    // 28px開始で、+45pxドラッグ → 73px → snap(73) = 84 (28*3)
    fireMouseDown(el, 100, 100)
    fireMouseMove(145, 145)
    fireMouseUp()

    const [x, y] = onMove.mock.calls[0]
    expect(x).toBe(snap(28 + 45)) // snap(73) = 84
    expect(y).toBe(snap(28 + 45)) // snap(73) = 84
  })
})

describe('snap', () => {
  it('0 → 0', () => {
    expect(snap(0)).toBe(0)
  })

  it('28 → 28', () => {
    expect(snap(28)).toBe(28)
  })

  it('14 → 28 (四捨五入)', () => {
    expect(snap(14)).toBe(28)
  })

  it('13 → 0 (四捨五入)', () => {
    expect(snap(13)).toBe(0)
  })

  it('SNAP_GRID定数は28', () => {
    expect(SNAP_GRID).toBe(28)
  })
})

describe('applyPosition', () => {
  let el

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  afterEach(() => {
    el.remove()
  })

  it('x,yを渡すとstyle.left/topにXpx形式設定', () => {
    applyPosition(el, 120, 300)

    expect(el.style.left).toBe('120px')
    expect(el.style.top).toBe('300px')
  })

  it('0を渡しても0px設定', () => {
    applyPosition(el, 0, 0)

    expect(el.style.left).toBe('0px')
    expect(el.style.top).toBe('0px')
  })
})

describe('getPosition', () => {
  let el

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  afterEach(() => {
    el.remove()
  })

  it('style.left/top設定済み→{x,y}取得', () => {
    el.style.left = '42px'
    el.style.top = '99px'

    expect(getPosition(el)).toEqual({ x: 42, y: 99 })
  })

  it('未設定→{x:0,y:0}', () => {
    expect(getPosition(el)).toEqual({ x: 0, y: 0 })
  })
})
