import { test, expect } from '@playwright/test'

// ════════════════════════════════════════════════════════
// 参加者ビューページ E2Eテスト
// ════════════════════════════════════════════════════════

test('IDなしでアクセスするとエラーメッセージ表示', async ({ page }) => {
  await page.goto('/view.html')
  await expect(page.locator('.error-msg')).toContainText('大会IDが指定されていません')
})

test('存在しないIDでアクセスするとエラー表示', async ({ page }) => {
  await page.goto('/view.html?id=nonexistent-id-12345')
  await page.waitForTimeout(3000)
  await expect(page.locator('.error-msg')).toBeVisible()
})

test('タブ切替が動作する', async ({ page }) => {
  await page.goto('/view.html?id=test')
  // デフォルトはテーブルタブ
  await expect(page.locator('.tab.active')).toContainText('テーブル')

  // 順位表タブをクリック
  await page.click('.tab[data-tab="standings"]')
  await expect(page.locator('.tab[data-tab="standings"]')).toHaveClass(/active/)
  await expect(page.locator('#panel-standings')).toHaveClass(/active/)

  // 対戦履歴タブをクリック
  await page.click('.tab[data-tab="history"]')
  await expect(page.locator('.tab[data-tab="history"]')).toHaveClass(/active/)
  await expect(page.locator('#panel-history')).toHaveClass(/active/)
})

test('名前検索の入力と記憶', async ({ page }) => {
  await page.goto('/view.html?id=test')

  // 名前を入力
  await page.fill('#search-input', '田中')
  await expect(page.locator('#search-clear')).toHaveClass(/show/)

  // ページリロードしても記憶されている
  await page.reload()
  await expect(page.locator('#search-input')).toHaveValue('田中')

  // クリアボタン
  await page.click('#search-clear')
  await expect(page.locator('#search-input')).toHaveValue('')
})

test('更新ボタンのスピンアニメーション', async ({ page }) => {
  await page.goto('/view.html?id=test')
  await page.click('#btn-refresh')
  // spinning クラスが一瞬付く
  await expect(page.locator('#btn-refresh')).toHaveClass(/spinning/)
  // 600ms後に消える
  await page.waitForTimeout(700)
  await expect(page.locator('#btn-refresh')).not.toHaveClass(/spinning/)
})
