import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:15173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: '../backend/.venv/bin/python ../backend/tests/e2e_server.py',
      url: 'http://127.0.0.1:18000/health/ready',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 15173 --strictPort',
      url: 'http://127.0.0.1:15173',
      env: { VITE_API_URL: '/api', API_PROXY_TARGET: 'http://127.0.0.1:18000' },
      reuseExistingServer: false,
    },
  ],
})
