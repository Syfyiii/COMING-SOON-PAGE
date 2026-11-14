import { defineConfig } from '@playwright/test'

const externalPreview = process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    {
      name: 'firefox',
      testMatch: '**/browser-smoke.spec.js',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit',
      testMatch: '**/browser-smoke.spec.js',
      use: { browserName: 'webkit' },
    },
  ],
  use: {
    baseURL: externalPreview || 'http://127.0.0.1:5180',
    viewport: { width: 1440, height: 1000 },
  },
  webServer: externalPreview
    ? undefined
    : {
        command:
          'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5180 --strictPort',
        url: 'http://127.0.0.1:5180',
        reuseExistingServer: !process.env.CI,
      },
})
