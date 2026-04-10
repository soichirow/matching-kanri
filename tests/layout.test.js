import { enableDrag, applyPosition, getPosition } from '../src/layout.js'

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
    el.style.left = '10px'
    el.style.top = '20px'
    document.body.appendChild(el)
  })

  afterEach(() => {
    el.remove()
  })

  it('mousedown→mousemove→mouseupで位置変更しonMoveが呼ばれる', () => {
    const onMove = vi.fn()
    enableDrag(el, onMove)

    fireMouseDown(el, 100, 100)
    fireMouseMove(150, 130)
    fireMouseUp()

    expect(el.style.left).toBe('60px')  // 10 + (150-100)
    expect(el.style.top).toBe('50px')   // 20 + (130-100)
    expect(onMove).toHaveBeenCalledWith(60, 50)
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
