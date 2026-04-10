import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: `file:///${process.cwd().replace(/\\/g, '/')}/index.html`,
    browserName: 'chromium',
  },
  webServer: undefined, // 静的HTMLなのでサーバー不要
})
