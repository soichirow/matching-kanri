import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyPosition, getPosition, enableDrag } from '../src/layout.js'

// ── applyPosition / getPosition ──────────────────────────

describe('applyPosition', () => {
  let el

  beforeEach(() => {
    el = document.createElement('div')
    document.body.appendChild(el)
  })

  afterEach(() => {
    el.remove()
  })

  it('left / top を px で設定する', () => {
    applyPosition(el, 100, 200)
    expect(el.style.left).toBe('100px')
    expect(el.style.top).toBe('200px')
  })

  it('0 を設定できる', () => {
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

  it('設定済みの位置を返す', () => {
    el.style.left = '150px'
    el.style.top  = '75px'
    expect(getPosition(el)).toEqual({ x: 150, y: 75 })
  })

  it('未設定なら { x: 0, y: 0 }', () => {
    expect(getPosition(el)).toEqual({ x: 0, y: 0 })
  })

  it('applyPosition → getPosition の往復', () => {
    applyPosition(el, 320, 480)
    expect(getPosition(el)).toEqual({ x: 320, y: 480 })
  })
})

// ── enableDrag ────────────────────────────────────────────

describe('enableDrag', () => {
  let el, moves

  beforeEach(() => {
    el = document.createElement('div')
    el.style.left = '50px'
    el.style.top  = '50px'
    document.body.appendChild(el)
    moves = []
  })

  afterEach(() => {
    el.remove()
  })

  it('戻り値に destroy メソッドがある', () => {
    const drag = enableDrag(el, () => {})
    expect(typeof drag.destroy).toBe('function')
    drag.destroy()
  })

  it('mousedown → mousemove で位置が変わる', () => {
    enableDrag(el, (x, y) => moves.push({ x, y }))

    el.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120 }))
    document.dispatchEvent(new MouseEvent('mouseup'))

    expect(moves.length).toBeGreaterThan(0)
    expect(moves[0].x).toBe(100) // 50 + (150-100)
    expect(moves[0].y).toBe(70)  // 50 + (120-100)
  })

  it('.no-drag の子要素からはドラッグ開始しない', () => {
    const btn = document.createElement('button')
    btn.className = 'no-drag'
    el.appendChild(btn)

    enableDrag(el, (x, y) => moves.push({ x, y }))

    btn.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 200 }))
    document.dispatchEvent(new MouseEvent('mouseup'))

    expect(moves).toHaveLength(0)
  })

  it('mouseup 後はドラッグ終了（移動しない）', () => {
    enableDrag(el, (x, y) => moves.push({ x, y }))

    el.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mouseup'))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 200 }))

    expect(moves).toHaveLength(0)
  })

  it('負の位置にはならない（min 0）', () => {
    el.style.left = '10px'
    el.style.top  = '10px'
    enableDrag(el, (x, y) => moves.push({ x, y }))

    el.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, bubbles: true }))
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 }))
    document.dispatchEvent(new MouseEvent('mouseup'))

    expect(moves[0].x).toBeGreaterThanOrEqual(0)
    expect(moves[0].y).toBeGreaterThanOrEqual(0)
  })
})
