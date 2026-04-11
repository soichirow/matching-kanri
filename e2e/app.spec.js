import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/admin.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('#app')
})

// ════════════════════════════════════════════════════════
// マッチング基本フロー（5ケース）
// ════════════════════════════════════════════════════════

test('プレイヤー一括追加→リスト表示確認', async ({ page }) => {
  await page.selectOption('#quick-add-count', '4')
  await page.click('#btn-quick-add')
  // 2人以上なのでカスタム確認ダイアログが開く
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  // プレイヤーリストに4人表示
  const items = page.locator('.player-item')
  await expect(items).toHaveCount(4)
  await expect(items.first().locator('.player-name')).toContainText('プレイヤー01')
  await expect(items.last().locator('.player-name')).toContainText('プレイヤー04')
})

test('テーブル一括追加→キャンバス表示確認', async ({ page }) => {
  await page.selectOption('#quick-add-table-count', '3')
  await page.click('#btn-quick-add-tables')
  // 2卓以上なのでカスタム確認ダイアログが開く
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  const cards = page.locator('.table-card')
  await expect(cards).toHaveCount(3)
  await expect(cards.first().locator('.table-label')).toContainText('テーブル1')
})

test('マッチング→仮マッチプレビュー→全確定→対戦中→全終了→待機復帰', async ({ page }) => {
  // セットアップ: 8人追加
  await page.selectOption('#quick-add-count', '8')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await expect(page.locator('.player-item')).toHaveCount(8)

  // 2卓追加
  await page.selectOption('#quick-add-table-count', '2')
  await page.click('#btn-quick-add-tables')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await expect(page.locator('.table-card')).toHaveCount(2)

  // マッチング生成
  await page.click('#btn-match')
  // 仮マッチ表示を確認
  await expect(page.locator('#match-preview')).toContainText('仮マッチ中')
  // 全確定ボタンが表示
  await expect(page.locator('#btn-confirm-match')).toBeVisible()

  // 全確定
  await page.click('#btn-confirm-match')
  // テーブルが「対戦中」に（対戦終了ボタンが表示）
  await expect(page.locator('.btn-finish').first()).toBeVisible()
  // 全終了ボタン表示
  await expect(page.locator('#btn-finish-all')).toBeVisible()

  // 全終了（カスタム確認ダイアログ）
  await page.click('#btn-finish-all')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  // ステータスが待機に戻る
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
  // デフォルトはダーク（data-theme属性なし）
  const html = page.locator('html')
  await expect(html).not.toHaveAttribute('data-theme', 'light')
  // 設定を開く
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  // ライトモードに切替
  await page.click('#dlg-theme-pills .dlg-pill[data-val="light"]')
  await page.click('#dlg-ok')
  // data-theme属性がlightに
  await expect(html).toHaveAttribute('data-theme', 'light')
})

// ════════════════════════════════════════════════════════
// ブラケット機能（3ケース）
// ════════════════════════════════════════════════════════

test('設定でブラケットON→プレイヤー追加ダイアログにブラケット欄表示', async ({ page }) => {
  // 設定でブラケットを有効化
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.locator('#dlg-enable-bracket').evaluate(el => { if (!el.checked) el.click() })
  await page.click('#dlg-ok')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)

  // 1人追加ダイアログを開く
  await page.selectOption('#quick-add-count', '1')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  // ブラケット欄が表示されている
  await expect(page.locator('#dlg-bracket-pills')).toBeVisible()
  await page.click('#dlg-cancel')
})

test('ブラケット付きプレイヤー追加→バッジ表示確認', async ({ page }) => {
  // 設定でブラケットを有効化
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.locator('#dlg-enable-bracket').evaluate(el => { if (!el.checked) el.click() })
  await page.click('#dlg-ok')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)

  // 1人追加ダイアログ
  await page.selectOption('#quick-add-count', '1')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  // 名前入力
  await page.fill('#dlg-pname', 'テスト選手')
  // ブラケットpillの「1」をクリック
  await page.click('#dlg-bracket-pills .dlg-pill[data-val="1"]')
  // 追加
  await page.click('#dlg-ok')

  // プレイヤーが追加され、ブラケットバッジが表示される
  const item = page.locator('.player-item').first()
  await expect(item.locator('.player-name')).toContainText('テスト選手')
  await expect(item.locator('.bracket-badge')).toContainText('1')
})

test('ブラケットOFF時は通常マッチング', async ({ page }) => {
  // ブラケットOFFの状態（デフォルト）で1人追加ダイアログを開く
  await page.selectOption('#quick-add-count', '1')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  // ブラケット欄が非表示
  await expect(page.locator('#dlg-bracket-pills')).toHaveCount(0)
  await page.click('#dlg-cancel')
})

// ════════════════════════════════════════════════════════
// カスタムダイアログ（3ケース）
// ════════════════════════════════════════════════════════

test('確認ダイアログ表示→OKで操作実行', async ({ page }) => {
  // 4人一括追加でカスタム確認ダイアログをテスト
  await page.selectOption('#quick-add-count', '4')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await expect(page.locator('#dlg-title')).toContainText('確認')
  await page.click('#dlg-ok')
  // OKで追加が実行される
  await expect(page.locator('.player-item')).toHaveCount(4)
})

test('確認ダイアログ→キャンセルで操作中止', async ({ page }) => {
  await page.selectOption('#quick-add-count', '4')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-cancel')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)
  // キャンセルしたので追加されていない
  await expect(page.locator('.player-item')).toHaveCount(0)
})

test('確認ダイアログ→Escapeキーで閉じる', async ({ page }) => {
  await page.selectOption('#quick-add-count', '4')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.keyboard.press('Escape')
  await expect(page.locator('#dlg-overlay')).toHaveClass(/hidden/)
  // Escapeで閉じたので追加されていない
  await expect(page.locator('.player-item')).toHaveCount(0)
})

// ════════════════════════════════════════════════════════
// レスポンシブ（3ケース）
// ════════════════════════════════════════════════════════

test('PC(1280x800): タイトル・ズームコントロール表示', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.reload()
  await page.waitForSelector('#app')
  // タイトル表示
  await expect(page.locator('.header-title')).toBeVisible()
  // ズームコントロール表示
  await expect(page.locator('.zoom-controls')).toBeVisible()
})

test('スマホ(375x667): タイトル・ズーム非表示', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.reload()
  await page.waitForSelector('#app')
  // タイトル非表示
  await expect(page.locator('.header-title')).not.toBeVisible()
  // ズームコントロール非表示
  await expect(page.locator('.zoom-controls')).not.toBeVisible()
})

test('スマホ(375x667): テーブルflex配置', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.reload()
  await page.waitForSelector('#app')
  // テーブル追加
  await page.selectOption('#quick-add-table-count', '2')
  await page.click('#btn-quick-add-tables')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await expect(page.locator('.table-card')).toHaveCount(2)
  // キャンバスがflex配置
  const display = await page.locator('#canvas').evaluate(el => getComputedStyle(el).display)
  expect(display).toBe('flex')
})

// ════════════════════════════════════════════════════════
// データ永続化（1ケース）
// ════════════════════════════════════════════════════════

test('プレイヤー追加→リロード→データ残存', async ({ page }) => {
  // 3人追加
  await page.selectOption('#quick-add-count', '3')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await expect(page.locator('.player-item')).toHaveCount(3)

  // リロード（localStorageはクリアしない）
  await page.reload()
  await page.waitForSelector('#app')
  // データが残っている
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
  // プレイヤー4人追加
  await page.selectOption('#quick-add-count', '4')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await expect(page.locator('.player-item')).toHaveCount(4)
  // テーブル2卓追加（1卓だと追加ダイアログが開く）
  await page.selectOption('#quick-add-table-count', '2')
  await page.click('#btn-quick-add-tables')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await expect(page.locator('.table-card')).toHaveCount(2)
  // 設定→新しいイベントを始める
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-new-tournament')
  // 確認ダイアログ
  await page.waitForTimeout(200)
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await page.waitForTimeout(200)
  // プレイヤーがリセット、テーブルは維持
  await expect(page.locator('.player-item')).toHaveCount(0)
  await expect(page.locator('.table-card')).toHaveCount(2)
})

test('解散ボタンに確認ダイアログが表示される', async ({ page }) => {
  // 4人追加
  await page.selectOption('#quick-add-count', '4')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  // 2卓追加
  await page.selectOption('#quick-add-table-count', '2')
  await page.click('#btn-quick-add-tables')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  // マッチング+確定
  await page.click('#btn-match')
  await page.waitForSelector('#btn-confirm-match:not([style*="display: none"])')
  await page.click('#btn-confirm-match')
  await expect(page.locator('.btn-disband').first()).toBeVisible()
  // 解散ボタンクリック→確認ダイアログ
  await page.locator('.btn-disband').first().click()
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await expect(page.locator('#dlg-body')).toContainText('解散しますか')
  await page.click('#dlg-cancel')
})

test('点数記録ON→テーブルカードにVP入力欄が表示', async ({ page }) => {
  // 設定でVPをON
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.locator('#dlg-enable-vp').evaluate(el => { if (!el.checked) el.click() })
  await page.click('#dlg-ok')
  // 4人追加
  await page.selectOption('#quick-add-count', '4')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  // 2卓追加
  await page.selectOption('#quick-add-table-count', '2')
  await page.click('#btn-quick-add-tables')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  // マッチング+確定
  await page.click('#btn-match')
  await page.waitForSelector('#btn-confirm-match:not([style*="display: none"])')
  await page.click('#btn-confirm-match')
  // VP入力欄が表示
  await expect(page.locator('.score-input').first()).toBeVisible()
})
