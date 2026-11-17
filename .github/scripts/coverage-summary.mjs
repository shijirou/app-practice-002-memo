// テストの網羅率（テストがコードのどれだけを実行したか）を、Markdown の表にして出力する。
// CI が、実行ごとの「Summary」に貼り付ける。結果の取り込みに失敗しても、CI は失敗にしない（表に「取得できず」と出す）。
import { existsSync, readFileSync } from 'node:fs'

const FRONTEND_JSON = 'frontend/coverage/coverage-summary.json'
const BACKEND_XML = 'backend/build/reports/jacoco/test/jacocoTestReport.xml'

const percent = (covered, total) => (total === 0 ? '-' : `${((100 * covered) / total).toFixed(1)}%`)
const cell = (covered, total) => `${percent(covered, total)}（${covered}/${total}）`

// 画面（Vitest の json-summary）
function frontendRow() {
  if (!existsSync(FRONTEND_JSON)) return ['画面（Vitest）', '取得できず', '取得できず']
  const { lines, branches } = JSON.parse(readFileSync(FRONTEND_JSON, 'utf8')).total
  return ['画面（Vitest）', cell(lines.covered, lines.total), cell(branches.covered, branches.total)]
}

// API（JaCoCo の XML）。パッケージ・クラスごとの数字を除いて、全体の数字だけを読む
function backendRow() {
  if (!existsSync(BACKEND_XML)) return ['API（JaCoCo）', '取得できず', '取得できず']
  const overall = readFileSync(BACKEND_XML, 'utf8').replace(/<package[\s\S]*?<\/package>/g, '')
  const counter = (type) => {
    const m = overall.match(new RegExp(`<counter type="${type}" missed="(\\d+)" covered="(\\d+)"/>`))
    return m ? [Number(m[2]), Number(m[1]) + Number(m[2])] : [0, 0]
  }
  const [lineCovered, lineTotal] = counter('LINE')
  const [branchCovered, branchTotal] = counter('BRANCH')
  return ['API（JaCoCo）', cell(lineCovered, lineTotal), cell(branchCovered, branchTotal)]
}

const rows = [frontendRow(), backendRow()]
console.log('## テストの網羅率')
console.log('')
console.log('| 対象 | 行 | 分岐 |')
console.log('|---|---|---|')
for (const row of rows) console.log(`| ${row.join(' | ')} |`)
console.log('')
console.log('行: 実行された行の割合。分岐: if などの枝のうち、実行された割合。測るだけで、低くても CI は失敗にしない。')
