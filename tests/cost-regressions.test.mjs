import test from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { budgetStatus, buildCostCentreTotals, rollup, buildMonthlySpendSeries, buildWellPhaseCosts } from '../src/lib/wellCost.ts'
import { parseDmrFiles, buildDmrImportPlan } from '../src/lib/dmrImport.ts'

function report(date, { name = 'report.xlsx', daily = 10, cumulative = 100, ogdcl = 20, well = 'Test Well' } = {}) {
  const rows = [
    ['Well Name', well], ['Date :', date],
    ['Engineer', 'Daily cost', 'Cumulative Cost'], ['SLB', daily, cumulative],
    ['', 'Daily cost OGDCL', 'Cumulative Cost OGDCL'], ['', ogdcl, 200],
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'WBM')
  return new File([XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })], name)
}

test('DMR reads the sheet date before an incorrect filename and retains OGDCL sub-header cost', async () => {
  const result = await parseDmrFiles([report('20-Aug-26', { name: '2026-08-21-report.xlsx' })])
  assert.deepEqual(result.errors, [])
  assert.equal(result.rows.length, 2)
  assert.equal(result.rows.find(r => r.contractor === 'OGDCL').amount, 20)
  assert.ok(result.rows.every(r => r.entryDate === '2026-08-20'))
})

test('DMR supports dates without filename prefixes and reports unreadable workbooks', async () => {
  const result = await parseDmrFiles([report('1-Sep-26'), new File(['invalid'], 'bad.xlsx')])
  assert.equal(result.rows[0].entryDate, '2026-09-01')
  assert.equal(result.errors.length, 1)
})

test('DMR reconciliation subtracts the next reported daily cost and uses the first duplicate', async () => {
  const result = await parseDmrFiles([
    report('1-Sep-26', { cumulative: 100 }),
    report('1-Sep-26', { cumulative: 110, name: 'duplicate.xlsx' }),
    report('4-Sep-26', { cumulative: 140 }),
  ])
  const gap = result.reconciliations.find(r => r.contractor === 'MUD_CONTRACTOR')
  assert.equal(gap.amount, 30)
  assert.equal(gap.missingDays, 2)
})

test('DMR does not reconcile between different wells or a decreasing cumulative reading', async () => {
  const mixed = await parseDmrFiles([report('1-Sep-26'), report('4-Sep-26', { cumulative: 140, well: 'Other Well' })])
  assert.deepEqual(mixed.reconciliations, [])
  const declining = await parseDmrFiles([report('1-Sep-26', { cumulative: 500 }), report('4-Sep-26', { cumulative: 140 })])
  assert.deepEqual(declining.reconciliations, [])
})

test('re-import skips duplicate costs while allowing missing remarks to be filled', () => {
  const row = { entryDate: '2026-09-01', contractor: 'OGDCL', amount: 20, remarks: 'Drilling' }
  const mapping = { OGDCL: 'c1', MUD_CONTRACTOR: '', SECOND_CONTRACTOR: '' }
  const existing = new Map([['c1|2026-09-01', { amount: 99, remarks: '' }]])
  assert.deepEqual(buildDmrImportPlan([row, row], mapping, existing).map(r => r.status), ['remarks-update', 'duplicate-in-batch'])
  existing.get('c1|2026-09-01').remarks = 'Existing narrative'
  assert.equal(buildDmrImportPlan([row], mapping, existing)[0].status, 'already-logged')
  assert.equal(existing.get('c1|2026-09-01').amount, 99)
})

test('budget states distinguish exact use, overrun, and missing budget at cent precision', () => {
  assert.equal(budgetStatus(100, 100), 'At budget')
  assert.equal(budgetStatus(100, 100.01), 'Over budget')
  assert.equal(budgetStatus(0, 10), 'Spend without budget')
  assert.equal(budgetStatus(0, 0), 'No budget')
  assert.equal(budgetStatus(0.3, 0.1 + 0.2), 'At budget')
})

test('rollups and monthly charts retain actuals, commitments, and credits', () => {
  const entries = [{ costCentreId: 'c1', amount: 80, kind: 'actual', entryDate: '2026-09-01' },
    { costCentreId: 'c1', amount: -10, kind: 'actual', entryDate: '2026-09-02' },
    { costCentreId: 'c1', amount: 20, kind: 'commitment', entryDate: '2026-09-03' }]
  assert.equal(rollup([{ id: 'c1', plannedBudget: 100 }], buildCostCentreTotals(entries)).available, 10)
  assert.equal(buildMonthlySpendSeries(entries)[0].actual, 70)
})

test('phase boundaries assign each transaction once and flag planned dates on both adjoining phases', () => {
  const phases = buildWellPhaseCosts('w1', [
    { wellId: 'w1', label: 'Spud', actualDate: '2026-09-01', plannedDate: '', sortOrder: 0, actualDepth: 0 },
    { wellId: 'w1', label: 'Casing', actualDate: '', plannedDate: '2026-09-03', sortOrder: 1, actualDepth: '' },
  ], [{ id: 'c1', wellId: 'w1' }], [1, 2, 3, 4].map(day => ({ costCentreId: 'c1', entryDate: `2026-09-0${day}`, amount: 10, kind: 'actual' })))
  assert.deepEqual(phases.map(p => p.actual), [10, 20, 10])
  assert.deepEqual(phases.map(p => p.usesPlannedDate), [false, true, true])
})
