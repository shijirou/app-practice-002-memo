// E2E テストの前に、専用の DB（memo_e2e）を作り直す。
// 普段使っている DB（memo）には、触れない（名前を固定している）。
// 実行には、DB のコンテナ（memo-db）が動いている必要がある: リポジトリ直下で `docker compose up -d`
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const E2E_DB = 'memo_e2e'
const CONTAINER = 'memo-db'

// DB のユーザー名は、リポジトリ直下の .env から読む（無ければ memo）
function dbUser() {
  const envFile = new URL('../../.env', import.meta.url)
  if (process.env.DB_USER) return process.env.DB_USER
  if (existsSync(envFile)) {
    const line = readFileSync(envFile, 'utf8').split(/\r?\n/).find((l) => l.startsWith('DB_USER='))
    if (line) return line.slice('DB_USER='.length).trim()
  }
  return 'memo'
}

function psql(sql) {
  execFileSync('docker', ['exec', CONTAINER, 'psql', '-U', dbUser(), '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    stdio: ['ignore', 'ignore', 'inherit'],
  })
}

try {
  psql(`DROP DATABASE IF EXISTS ${E2E_DB} WITH (FORCE)`)
  psql(`CREATE DATABASE ${E2E_DB}`)
  console.log(`E2E 用の DB（${E2E_DB}）を作り直しました`)
} catch {
  console.error(`E2E 用の DB を作れませんでした。DB のコンテナ（${CONTAINER}）が動いているか確認してください: docker compose up -d`)
  process.exit(1)
}
