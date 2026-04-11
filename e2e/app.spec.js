import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('#app')
})

// ── ヘルパー: ダイアログ経由でプレイヤー追加 ────────────
async function addPlayers(page, count) {
  await page.click('#btn-add-players')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  // count のpillを選択
  const pill = page.locator(`#dlg-player-count-pills .dlg-pill[data-val="${count}"]`)
  if (await pill.count()) await pill.click()
  await page.click('#dlg-ok')
  // count=1の場合は個別追加ダイアログが開くので、ここでは2以上を想定
  if (count > 1) await page.waitForSelector('#dlg-overlay.hidden', { state: 'attached' })
}

// ── ヘルパー: ダイアログ経由でテーブル追加 ────────────
async function addTables(page, count, size = 4) {
  await page.click('#btn-add-tables')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  // count のpillを選択
  const countPill = page.locator(`#dlg-table-count-pills .dlg-pill[data-val="${count}"]`)
  if (await countPill.count()) await countPill.click()
  // size のpillを選択
  const sizePill = page.locator(`#dlg-table-size-pills .dlg-pill[data-val="${size}"]`)
  if (await sizePill.count()) await sizePill.click()
  await page.click('#dlg-ok')
  await page.waitForSelector('#dlg-overlay.hidden', { state: 'attached' })
}

// ── ヘルパー: 1人追加ダイアログ（名前入力版） ──────────
async function addOnePlayer(page) {
  await page.click('#btn-add-players')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  const pill = page.locator('#dlg-player-count-pills .dlg-pill[data-val="1"]')
  await pill.click()
  await page.click('#dlg-ok')
  // 個別追加ダイアログが開く
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
}

// ════════════════════════════════════════════════════════
// マッチング基本フロー（5ケース）
// ════════════════════════════════════════════════════════

test('プレイヤー一括追加→リスト表示確認', async ({ page }) => {
  await addPlayers(page, 4)
  const items = page.locator('.player-item')
  await expect(items).toHaveCount(4)
  await expect(items.first().locator('.player-name')).toContainText('プレイヤー01')
  await expect(items.last().locator('.player-name')).toContainText('プレイヤー04')
})

test('テーブル一括追加→キャンバス表示確認', async ({ page }) => {
  await addTables(page, 3)
  const cards = page.locator('.table-card')
  await expect(cards).toHaveCount(3)
  await expect(cards.first().locator('.table-label')).toContainText('テーブル1')
})

test('マッチング→仮マッチプレビュー→全確定→対戦中→全終了→待機復帰', async ({ page }) => {
  await addPlayers(page, 8)
  await expect(page.locator('.player-item')).toHaveCount(8)
  await addTables(page, 2)
  await expect(page.locator('.table-card')).toHaveCount(2)

  // マッチング生成
  await page.click('#btn-match')
  await expect(page.locator('#match-preview')).toContainText('仮マッチ中')
  await expect(page.locator('#btn-confirm-match')).toBeVisible()

  // 全確定
  await page.click('#btn-confirm-match')
  await expect(page.locator('.btn-finish').first()).toBeVisible()
  await expect(page.locator('#btn-finish-all')).toBeVisible()

  // 全終了
  await page.click('#btn-finish-all')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await expect(page.locator('.player-stats')).toContainText('待機8')
})

test('設定ダイアログの開閉', async ({ page }) => {
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await expect(page.locator('#dlg-title')).toContainText('設定')
  await page.click('#dlg-cancel')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)
})

test('テーマ切替(ダーク→ライト)', async ({ page }) => {
  const html = page.locator('html')
  await expect(html).not.toHaveAttribute('data-theme', 'light')
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-theme-pills .dlg-pill[data-val="light"]')
  await page.click('#dlg-ok')
  await expect(html).toHaveAttribute('data-theme', 'light')
})

// ════════════════════════════════════════════════════════
// ブラケット機能（3ケース）
// ════════════════════════════════════════════════════════

test('設定でブラケットON→プレイヤー追加ダイアログにブラケット欄表示', async ({ page }) => {
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.locator('#dlg-enable-bracket').evaluate(el => { if (!el.checked) el.click() })
  await page.click('#dlg-ok')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)

  // 1人追加ダイアログを開く
  await addOnePlayer(page)
  await expect(page.locator('#dlg-bracket-pills')).toBeVisible()
  await page.click('#dlg-cancel')
})

test('ブラケット付きプレイヤー追加→バッジ表示確認', async ({ page }) => {
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.locator('#dlg-enable-bracket').evaluate(el => { if (!el.checked) el.click() })
  await page.click('#dlg-ok')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)

  await addOnePlayer(page)
  await page.fill('#dlg-pname', 'テスト選手')
  await page.click('#dlg-bracket-pills .dlg-pill[data-val="1"]')
  await page.click('#dlg-ok')

  const item = page.locator('.player-item').first()
  await expect(item.locator('.player-name')).toContainText('テスト選手')
  await expect(item.locator('.bracket-badge')).toContainText('1')
})

test('ブラケットOFF時は通常マッチング', async ({ page }) => {
  await addOnePlayer(page)
  await expect(page.locator('#dlg-bracket-pills')).toHaveCount(0)
  await page.click('#dlg-cancel')
})

// ════════════════════════════════════════════════════════
// カスタムダイアログ（3ケース）
// ════════════════════════════════════════════════════════

test('確認ダイアログ表示→OKで操作実行', async ({ page }) => {
  // テーブル追加ダイアログで4卓追加
  await addTables(page, 4)
  await expect(page.locator('.table-card')).toHaveCount(4)
})

test('確認ダイアログ→キャンセルで操作中止', async ({ page }) => {
  await page.click('#btn-add-tables')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-cancel')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)
  await expect(page.locator('.table-card')).toHaveCount(0)
})

test('確認ダイアログ→Escapeキーで閉じる', async ({ page }) => {
  await page.click('#btn-add-tables')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.keyboard.press('Escape')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)
  await expect(page.locator('.table-card')).toHaveCount(0)
})

// ════════════════════════════════════════════════════════
// レスポンシブ（3ケース）
// ════════════════════════════════════════════════════════

test('PC(1280x800): タイトル・ズームコントロール表示', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.reload()
  await page.waitForSelector('#app')
  await expect(page.locator('.header-title')).toBeVisible()
  await expect(page.locator('.zoom-controls')).toBeVisible()
})

test('スマホ(375x667): タイトル・ズーム非表示', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.reload()
  await page.waitForSelector('#app')
  await expect(page.locator('.header-title')).not.toBeVisible()
  await expect(page.locator('.zoom-controls')).not.toBeVisible()
})

test('スマホ(375x667): テーブルflex配置', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.reload()
  await page.waitForSelector('#app')
  await addTables(page, 2)
  await expect(page.locator('.table-card')).toHaveCount(2)
  const display = await page.locator('#canvas').evaluate(el => getComputedStyle(el).display)
  expect(display).toBe('flex')
})

// ════════════════════════════════════════════════════════
// データ永続化（1ケース）
// ════════════════════════════════════════════════════════

test('プレイヤー追加→リロード→データ残存', async ({ page }) => {
  await addPlayers(page, 3)
  await expect(page.locator('.player-item')).toHaveCount(3)
  await page.reload()
  await page.waitForSelector('#app')
  await expect(page.locator('.player-item')).toHaveCount(3)
  await expect(page.locator('.player-item').first().locator('.player-name')).toContainText('プレイヤー01')
})

// ════════════════════════════════════════════════════════
// イベント名・新イベント・解散（4ケース）
// ════════════════════════════════════════════════════════

test('イベント名を設定→ヘッダーに反映', async ({ page }) => {
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.fill('#dlg-tournament-name', 'テスト交流会')
  await page.click('#dlg-ok')
  await expect(page.locator('#header-title')).toContainText('テスト交流会')
})

test('新しいイベントを始める→プレイヤーリセット、テーブル維持', async ({ page }) => {
  await addPlayers(page, 4)
  await expect(page.locator('.player-item')).toHaveCount(4)
  await addTables(page, 2)
  await expect(page.locator('.table-card')).toHaveCount(2)
  // 設定→新しいイベントを始める
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-new-tournament')
  await page.waitForSelector('#dlg-ok', { state: 'visible' })
  await page.click('#dlg-ok')
  await page.waitForSelector('#dlg-overlay', { state: 'hidden' })
  await expect(page.locator('.player-item')).toHaveCount(0)
  await expect(page.locator('.table-card')).toHaveCount(2)
})

test('解散ボタンに確認ダイアログが表示される', async ({ page }) => {
  await addPlayers(page, 4)
  await addTables(page, 2)
  await page.click('#btn-match')
  await page.waitForSelector('#btn-confirm-match:not([style*="display: none"])')
  await page.click('#btn-confirm-match')
  await expect(page.locator('.btn-disband').first()).toBeVisible()
  await page.locator('.btn-disband').first().click()
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await expect(page.locator('#dlg-body')).toContainText('解散しますか')
  await page.click('#dlg-cancel')
})

test('点数記録ON→テーブルカードにVP入力欄が表示', async ({ page }) => {
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.locator('#dlg-enable-vp').evaluate(el => { if (!el.checked) el.click() })
  await page.click('#dlg-ok')
  await addPlayers(page, 4)
  await addTables(page, 2)
  await page.click('#btn-match')
  await page.waitForSelector('#btn-confirm-match:not([style*="display: none"])')
  await page.click('#btn-confirm-match')
  await expect(page.locator('.score-input').first()).toBeVisible()
})
