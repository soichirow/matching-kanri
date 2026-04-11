import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5176',
    browserName: 'chromium',
  },
  webServer: {
    command: 'npx vite --port 5176',
    port: 5176,
    reuseExistingServer: true,
  },
})
