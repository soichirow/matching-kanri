/**
 * layout.js — テーブルカードのドラッグ&ドロップ位置管理
 */

/**
 * 要素にドラッグ機能を付与する
 * .no-drag クラスを持つ子要素からはドラッグを開始しない
 *
 * @param {HTMLElement} el
 * @param {(x: number, y: number) => void} onMove  移動後コールバック
 * @returns {{ destroy: () => void }}
 */
export function enableDrag(el, onMove) {
  let startMouseX, startMouseY, startLeft, startTop, dragging = false

  function onMouseDown(e) {
    if (e.target.closest('.no-drag')) return
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function onTouchStart(e) {
    if (e.target.closest('.no-drag')) return
    e.preventDefault()
    const t = e.touches[0]
    startDrag(t.clientX, t.clientY)
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
  }

  function startDrag(cx, cy) {
    dragging = true
    startMouseX = cx
    startMouseY = cy
    startLeft = parseInt(el.style.left) || 0
    startTop  = parseInt(el.style.top)  || 0
    el.classList.add('dragging')
  }

  function onMouseMove(e) { if (dragging) move(e.clientX, e.clientY) }
  function onTouchMove(e) {
    if (!dragging) return
    e.preventDefault()
    move(e.touches[0].clientX, e.touches[0].clientY)
  }

  function move(cx, cy) {
    const x = Math.max(0, startLeft + cx - startMouseX)
    const y = Math.max(0, startTop  + cy - startMouseY)
    el.style.left = x + 'px'
    el.style.top  = y + 'px'
    if (onMove) onMove(x, y)
  }

  function onMouseUp() {
    end()
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  function onTouchEnd() {
    end()
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
  }

  function end() {
    dragging = false
    el.classList.remove('dragging')
  }

  el.addEventListener('mousedown', onMouseDown)
  el.addEventListener('touchstart', onTouchStart, { passive: false })

  return {
    destroy() {
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('touchstart', onTouchStart)
    }
  }
}

/**
 * 要素に絶対位置を適用する
 * @param {HTMLElement} el
 * @param {number} x
 * @param {number} y
 */
export function applyPosition(el, x, y) {
  el.style.left = x + 'px'
  el.style.top  = y + 'px'
}

/**
 * 要素の現在位置を取得する
 * @param {HTMLElement} el
 * @returns {{ x: number, y: number }}
 */
export function getPosition(el) {
  return {
    x: parseInt(el.style.left) || 0,
    y: parseInt(el.style.top)  || 0,
  }
}
