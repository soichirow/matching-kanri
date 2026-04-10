import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appUrl = `file:///${path.resolve(__dirname, '../index.html').replace(/\\/g, '/')}`

test.beforeEach(async ({ page }) => {
  await page.goto(appUrl)
  // localStorageクリア
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

// ── プレイヤー追加 ──────────────────────────────────────

test('プレイヤーを一括追加できる', async ({ page }) => {
  // 4人追加
  await page.selectOption('#quick-add-count', '4')
  page.on('dialog', d => d.accept()) // confirm
  await page.click('#btn-quick-add')
  // プレイヤーリストに4人表示
  const items = page.locator('.player-item')
  await expect(items).toHaveCount(4)
  await expect(items.first().locator('.player-name')).toContainText('プレイヤー01')
})

test('プレイヤー1人追加でダイアログが開く', async ({ page }) => {
  await page.selectOption('#quick-add-count', '1')
  await page.click('#btn-quick-add')
  // ダイアログが表示される
  await expect(page.locator('#dlg-overlay')).not.toHaveClass(/hidden/)
  await expect(page.locator('#dlg-title')).toContainText('プレイヤーを追加')
})

test('名前空欄で追加するとプレイヤーXX形式で追加', async ({ page }) => {
  await page.selectOption('#quick-add-count', '1')
  await page.click('#btn-quick-add')
  // 名前入力せずに追加
  await page.click('#dlg-ok')
  const items = page.locator('.player-item')
  await expect(items).toHaveCount(1)
  await expect(items.first().locator('.player-name')).toContainText('プレイヤー01')
})

// ── テーブル追加 ────────────────────────────────────────

test('テーブルを一括追加できる', async ({ page }) => {
  await page.selectOption('#quick-add-table-count', '3')
  page.on('dialog', d => d.accept())
  await page.click('#btn-quick-add-tables')
  const cards = page.locator('.table-card')
  await expect(cards).toHaveCount(3)
})

// ── マッチング→確定→終了フロー ──────────────────────────

test('マッチング→確定→終了の一連フロー', async ({ page }) => {
  // セットアップ: 8人 + 2卓
  await page.selectOption('#quick-add-count', '8')
  page.on('dialog', d => d.accept())
  await page.click('#btn-quick-add')
  await page.selectOption('#quick-add-table-count', '2')
  await page.click('#btn-quick-add-tables')

  // マッチング生成
  await page.click('#btn-match')
  // 仮マッチ表示
  await expect(page.locator('#match-preview')).toContainText('仮マッチ中')
  // 全確定ボタンが表示
  await expect(page.locator('#btn-confirm-match')).toBeVisible()

  // 全確定
  await page.click('#btn-confirm-match')
  // テーブルが「対戦中」に（対戦終了ボタンが表示）
  await expect(page.locator('.btn-finish').first()).toBeVisible()
  // 全終了ボタン表示
  await expect(page.locator('#btn-finish-all')).toBeVisible()

  // 全終了（confirmダイアログ）
  await page.click('#btn-finish-all')
  // ステータスが待機に戻る
  await expect(page.locator('.player-stats')).toContainText('待機8')
})

// ── 元に戻す ────────────────────────────────────────────

test('元に戻すが動作する', async ({ page }) => {
  await page.selectOption('#quick-add-count', '4')
  page.on('dialog', d => d.accept())
  await page.click('#btn-quick-add')
  await expect(page.locator('.player-item')).toHaveCount(4)

  // Undo
  await page.click('#btn-undo')
  // トースト表示
  await expect(page.locator('#toast')).toHaveClass(/show/)
})

// ── 設定ダイアログ ──────────────────────────────────────

test('設定ダイアログが開閉する', async ({ page }) => {
  await page.click('#btn-settings')
  await expect(page.locator('#dlg-overlay')).not.toHaveClass(/hidden/)
  await expect(page.locator('#dlg-title')).toContainText('設定')
  await page.click('#dlg-cancel')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)
})

test('テーマ切替が動作する', async ({ page }) => {
  await page.click('#btn-settings')
  // ライトモードに切替
  await page.click('#dlg-theme-pills .dlg-pill[data-val="light"]')
  await page.click('#dlg-ok')
  // data-theme属性がlightに
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

// ── 順位表 ──────────────────────────────────────────────

test('順位表が表示される', async ({ page }) => {
  await page.click('#btn-standings')
  await expect(page.locator('#dlg-title')).toContainText('順位表')
})

// ── ヘルプ ──────────────────────────────────────────────

test('ヘルプが表示される', async ({ page }) => {
  await page.click('#btn-help')
  await expect(page.locator('#dlg-title')).toContainText('ヘルプ')
})

// ── 選択モード ──────────────────────────────────────────

test('選択モードの切替', async ({ page }) => {
  await page.click('#btn-toggle-checks')
  await expect(page.locator('#player-panel')).toHaveClass(/check-mode/)
  await page.click('#btn-toggle-checks')
  await expect(page.locator('#player-panel')).not.toHaveClass(/check-mode/)
})

// ── スマホレイアウト ────────────────────────────────────

test('スマホ幅でマッチングバーが固定表示', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.reload()
  const bar = page.locator('.matching-bar')
  const style = await bar.evaluate(el => getComputedStyle(el).position)
  expect(style).toBe('fixed')
})

test('スマホ幅でテーブルカードがflex配置', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.reload()
  await page.selectOption('#quick-add-table-count', '2')
  page.on('dialog', d => d.accept())
  await page.click('#btn-quick-add-tables')
  const canvas = page.locator('#canvas')
  const display = await canvas.evaluate(el => getComputedStyle(el).display)
  expect(display).toBe('flex')
})
