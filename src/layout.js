/**
 * layout.js — テーブルカードのドラッグ&ドロップ位置管理
 *
 * admin.html のインラインJS版と同期:
 *   - グリッドスナップ (snap関数, SNAP_GRID=28px)
 *   - スマホ判定 (isMobile) でタッチドラッグ無効化
 *   - onMove はドラッグ終了時のみ呼ばれる（スナップ後の座標で）
 */

export const SNAP_GRID = 28
export const snap = v => Math.round(v / SNAP_GRID) * SNAP_GRID
export const isMobile = () => window.innerWidth <= 768

/**
 * 要素にドラッグ機能を付与する
 * .no-drag クラスを持つ子要素からはドラッグを開始しない
 *
 * @param {HTMLElement} el
 * @param {(x: number, y: number) => void} onMove  移動後コールバック（end時のみ）
 * @returns {{ destroy: () => void }}
 */
export function enableDrag(el, onMove) {
  let startMX, startMY, startL, startT, dragging = false

  const startDrag = (cx, cy) => {
    dragging = true
    startMX = cx; startMY = cy
    startL = parseInt(el.style.left) || 0
    startT = parseInt(el.style.top)  || 0
    el.classList.add('dragging')
  }
  const move = (cx, cy) => {
    const x = Math.max(0, startL + cx - startMX)
    const y = Math.max(0, startT + cy - startMY)
    el.style.left = `${x}px`
    el.style.top  = `${y}px`
  }
  const end = () => {
    dragging = false
    el.classList.remove('dragging')
    // グリッドにスナップ
    const sx = snap(Math.max(0, parseInt(el.style.left) || 0))
    const sy = snap(Math.max(0, parseInt(el.style.top)  || 0))
    el.style.left = `${sx}px`
    el.style.top  = `${sy}px`
    onMove?.(sx, sy)
  }

  const onMM = e => { if (dragging) move(e.clientX, e.clientY) }
  const onMU = () => { end(); document.removeEventListener('mousemove', onMM); document.removeEventListener('mouseup', onMU) }
  const onTM = e => { if (!dragging) return; e.preventDefault(); move(e.touches[0].clientX, e.touches[0].clientY) }
  const onTE = () => { end(); document.removeEventListener('touchmove', onTM); document.removeEventListener('touchend', onTE) }

  function onMouseDown(e) {
    if (e.target.closest('.no-drag')) return
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
    document.addEventListener('mousemove', onMM)
    document.addEventListener('mouseup', onMU)
  }

  function onTouchStart(e) {
    if (isMobile()) return  // スマホではドラッグ無効、通常スクロールを許可
    if (e.target.closest('.no-drag')) return
    e.preventDefault()
    startDrag(e.touches[0].clientX, e.touches[0].clientY)
    document.addEventListener('touchmove', onTM, { passive: false })
    document.addEventListener('touchend', onTE)
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
