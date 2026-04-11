import { test, expect } from '@playwright/test'

// ════════════════════════════════════════════════════════
// イベント共有機能 E2Eテスト
// ════════════════════════════════════════════════════════

test.beforeEach(async ({ page }) => {
  await page.goto('/admin.html')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('#app')
})

test('設定画面にイベント共有セクションが表示される', async ({ page }) => {
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await expect(page.locator('#dlg-body')).toContainText('イベント共有')
  await expect(page.locator('#dlg-share-start')).toBeVisible()
  await page.click('#dlg-cancel')
})

test('イベント共有ボタンでイベントIDが発行される', async ({ page }) => {
  // プレイヤー追加
  await page.selectOption('#quick-add-count', '4')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await expect(page.locator('.player-item')).toHaveCount(4)

  // 設定→イベント共有
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-share-start')

  // 共有後、ダイアログが自動で再オープンし共有URLが表示される
  await expect(page.locator('#dlg-share-url')).toBeVisible({ timeout: 10000 })
  const url = await page.locator('#dlg-share-url').textContent()
  expect(url).toContain('view.html?id=')

  // コピー・同期・停止ボタンが表示
  await expect(page.locator('#dlg-share-copy')).toBeVisible()
  await expect(page.locator('#dlg-share-now')).toBeVisible()
  await expect(page.locator('#dlg-share-stop')).toBeVisible()

  await page.click('#dlg-cancel')
})

test('共有後のview.htmlにデータが表示される', async ({ page, context }) => {
  // セットアップ: 4人追加
  await page.selectOption('#quick-add-count', '4')
  await page.click('#btn-quick-add')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-ok')
  await expect(page.locator('.player-item')).toHaveCount(4)

  // 設定→イベント共有→自動再オープンを待つ
  await page.click('#btn-settings')
  await page.waitForSelector('#dlg-overlay:not(.hidden)')
  await page.click('#dlg-share-start')
  await expect(page.locator('#dlg-share-url')).toBeVisible({ timeout: 10000 })

  // 今すぐ同期
  await page.click('#dlg-share-now')
  await page.waitForTimeout(3000)

  const shareUrl = await page.locator('#dlg-share-url').textContent()
  await page.click('#dlg-cancel')

  // 別タブでview.htmlを開く
  const viewPage = await context.newPage()
  const urlObj = new URL(shareUrl)
  await viewPage.goto(urlObj.pathname + urlObj.search)

  // データが表示されるまで待つ
  await viewPage.waitForTimeout(5000)

  // プレイヤーが順位表に表示される
  await viewPage.click('.tab[data-tab="standings"]')
  await viewPage.waitForTimeout(500)
  const rows = await viewPage.locator('.standings-table tbody tr').count()
  expect(rows).toBeGreaterThan(0)

  await viewPage.close()
})
