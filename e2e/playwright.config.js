import { defineConfig } from '@playwright/test'

const isCI = Boolean(process.env.CI)
const isWindows = process.platform === 'win32'

// 画面と API を、決められたポート（画面 5173・API 8080）で、テストの間だけ起動する。
// API は、専用の DB（memo_e2e）につなぐ（普段の DB には触れない。`npm test` の前に scripts/prepare-db.mjs が作り直す）。
// すでに起動しているサーバーは、使い回さない（開発用のサーバーが、本物の DB につながったまま、テストに使われないように）。
// 先に開発用のサーバー（画面・API）を止めること。
export default defineConfig({
  testDir: './tests',
  // 1 つの DB を共有するので、1 つずつ順番に動かす
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    // 失敗したときだけ、あとで見返せる記録（画面・動画・操作の履歴）を残す
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // 手元では、入っている Edge を使う（ブラウザのダウンロードが要らない）。CI では、Playwright の Chromium
    ...(isCI ? {} : { channel: 'msedge' }),
  },
  webServer: [
    {
      command: isWindows ? '.\\gradlew.bat bootRun' : './gradlew bootRun',
      cwd: '../backend',
      env: { DB_NAME: 'memo_e2e' },
      url: 'http://127.0.0.1:8080/api/memos/counts',
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: 'npm run dev',
      cwd: '../frontend',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
