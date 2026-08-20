import { defineConfig, devices } from '@playwright/test'

const pathPrefix = process.env.GITHUB_ACTIONS ? '/audio-browser-lab/' : '/'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:4173${pathPrefix}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: `http://127.0.0.1:4173${pathPrefix}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
