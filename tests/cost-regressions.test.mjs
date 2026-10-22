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

test('DMR re-import does not repost a day already logged under another cost centre', () => {
  const row = { fileName: 'DMR#459.xlsx', entryDate: '2026-09-30', contractor: 'OGDCL', sourceLabel: 'OGDCL', amount: 1015, wellName: 'Gurgalot X-1', remarks: '', cumulative: null }
  const mapping = { OGDCL: 'c2', MUD_CONTRACTOR: '', SECOND_CONTRACTOR: '' }
  const loggedAmounts = new Set([`2026-09-30|${(1015).toFixed(2)}`])
  assert.equal(buildDmrImportPlan([row], mapping, new Map(), loggedAmounts)[0].status, 'already-logged')
  assert.equal(buildDmrImportPlan([row], mapping, new Map())[0].status, 'new')
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
  const summary = rollup([{ id: 'c1', plannedBudget: 100 }], buildCostCentreTotals(entries))
  assert.equal(summary.available, 30)
  assert.equal(summary.commitments, 20)
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

test('mud engineering accrues USD 550 per day from spud (both ends counted) unless overridden', async () => {
  const { buildMudEngineeringEntries, mudEngineeringDays } = await import('../src/lib/wellCost.ts')
  assert.equal(mudEngineeringDays('2026-10-01', '2026-10-03'), 3)
  assert.equal(mudEngineeringDays('2026-10-05', '2026-10-03'), 0)
  const milestones = [
    { wellId: 'w1', label: 'Spud', actualDate: '2026-10-01', plannedDate: '' },
    { wellId: 'w1', label: 'End of drilling', actualDate: '2026-10-02', plannedDate: '' },
    { wellId: 'w1', label: 'Well on testing', actualDate: '2026-10-02', plannedDate: '' },
  ]
  const centres = [
    { id: 'c1', wellId: 'w1', costCentre: 'DRFD02', overrideAmount: '' },
    { id: 'c2', wellId: 'w1', costCentre: 'drfc02', overrideAmount: '' },
    { id: 'c3', wellId: 'w1', costCentre: 'DRFD01', overrideAmount: '' },
    { id: 'c4', wellId: 'w1', costCentre: 'DRFD02', overrideAmount: 2000 },
  ]
  const entries = buildMudEngineeringEntries(centres, milestones, '2026-10-03')
  const byCentre = (id) => entries.filter((e) => e.costCentreId === id)
  assert.equal(byCentre('c1').length, 2)
  assert.equal(byCentre('c1').reduce((s, e) => s + e.amount, 0), 1100)
  assert.equal(byCentre('c2').length, 2)
  assert.equal(byCentre('c3').length, 0)
  assert.deepEqual(byCentre('c4').map((e) => e.amount), [2000])
  assert.deepEqual(buildMudEngineeringEntries([centres[0]], [], '2026-10-03'), [])
})

test('spud date is found under any spud-like milestone label, using actual before planned', async () => {
  const { spudDateForWell } = await import('../src/lib/wellCost.ts')
  const milestones = [
    { wellId: 'w1', label: '20" Casing', actualDate: '2026-09-20', plannedDate: '' },
    { wellId: 'w1', label: 'Spud Date', actualDate: '', plannedDate: '2026-09-15' },
    { wellId: 'w2', label: 'Spud', actualDate: '2026-01-01', plannedDate: '' },
  ]
  assert.equal(spudDateForWell('w1', milestones), '2026-09-15')
  assert.equal(spudDateForWell('w3', milestones), null)
})

test('projection: burn rate, forecast and status use calendar days with no entry counted as zero', async () => {
  const { dailyActualSpend, burnRate, forecastAtCompletion, projectionStatus, cumulativeWithForecast, activityCells } = await import('../src/lib/projection.ts')
  const tx = [
    { costCentreId: 'c1', kind: 'actual', entryDate: '2026-09-01', amount: 100 },
    { costCentreId: 'c1', kind: 'actual', entryDate: '2026-09-03', amount: 70 },
    { costCentreId: 'c1', kind: 'commitment', entryDate: '2026-09-03', amount: 999 },
    { costCentreId: 'other', kind: 'actual', entryDate: '2026-09-03', amount: 5 },
  ]
  const daily = dailyActualSpend(tx, new Set(['c1']))
  assert.deepEqual(daily, [{ date: '2026-09-01', amount: 100 }, { date: '2026-09-03', amount: 70 }])
  // 7-day window ending 3-Sep covers 28-Aug..3-Sep: 170 over 7 calendar days.
  assert.equal(burnRate(daily, 7), 24.29)
  assert.equal(forecastAtCompletion(170, 24.29, 10), 412.9)
  assert.equal(projectionStatus(412.9, 500), 'At risk')
  assert.equal(projectionStatus(600, 500), 'Over budget')
  assert.equal(projectionStatus(100, 500), 'On track')
  assert.equal(projectionStatus(100, 0), 'No budget')
  const points = cumulativeWithForecast(daily, 10, 2)
  assert.deepEqual(points.at(-1), { date: '2026-09-05', forecast: 190 })
  assert.equal(points.find(p => p.date === '2026-09-03').forecast, 170)
  assert.equal(activityCells(daily, 4).length, 4)
})

test('DMR flags a report whose cumulative movement disagrees with its daily figure', async () => {
  const day1 = report('1-Sep-26', { name: 'a.xlsx', daily: 10, cumulative: 100 })
  const day2ok = report('2-Sep-26', { name: 'b.xlsx', daily: 10, cumulative: 110 })
  const day2bad = report('2-Sep-26', { name: 'c.xlsx', daily: 10, cumulative: 130 })
  const ok = await parseDmrFiles([day1, day2ok])
  assert.equal(ok.cumulativeChecks.filter(c => c.contractor === 'MUD_CONTRACTOR').length, 0)
  const bad = await parseDmrFiles([day1, day2bad])
  const flagged = bad.cumulativeChecks.find(c => c.contractor === 'MUD_CONTRACTOR')
  assert.equal(flagged.entryDate, '2026-09-02')
  assert.equal(flagged.difference, 20)
})

test('projection: cost at milestones uses cumulative actual spend up to each milestone date', async () => {
  const { costAtMilestones, dailyActualSpend, importedDates, activityCells } = await import('../src/lib/projection.ts')
  const tx = [
    { costCentreId: 'c1', kind: 'actual', entryDate: '2026-09-01', amount: 100, notes: 'Imported from DMR#1.xlsx' },
    { costCentreId: 'c1', kind: 'actual', entryDate: '2026-09-03', amount: 50, notes: 'Typed in' },
  ]
  const daily = dailyActualSpend(tx, new Set(['c1']))
  const pts = costAtMilestones([
    { label: 'TD', actualDate: '2026-09-03', actualDepth: 2000 },
    { label: 'Surface', actualDate: '2026-09-01', actualDepth: 500 },
    { label: 'No depth', actualDate: '2026-09-02', actualDepth: '' },
  ], daily)
  assert.deepEqual(pts.map(p => [p.label, p.cumulativeCost]), [['Surface', 100], ['TD', 150]])
  const imported = importedDates(tx, new Set(['c1']))
  assert.deepEqual([...imported], ['2026-09-01'])
  const cells = activityCells(daily, 3, imported)
  assert.deepEqual(cells.map(c => c.date), ['2026-09-01', '2026-09-02', '2026-09-03'])
  assert.deepEqual(cells.map(c => c.imported), [true, false, false])
})

test('projection: cost against depth uses each day with a measured depth', async () => {
  const { costAtDepthDays, dailyActualSpend } = await import('../src/lib/projection.ts')
  const daily = dailyActualSpend([
    { costCentreId: 'c1', kind: 'actual', entryDate: '2026-09-01', amount: 100 },
    { costCentreId: 'c1', kind: 'actual', entryDate: '2026-09-02', amount: 40 },
  ], new Set(['c1']))
  const pts = costAtDepthDays([
    { entryDate: '2026-09-02', depthMd: 800 },
    { entryDate: '2026-09-01', depthMd: 500 },
    { entryDate: '2026-09-03', depthMd: '' },
  ], daily)
  assert.deepEqual(pts.map(p => [p.date, p.depth, p.cumulativeCost]), [['2026-09-01', 500, 100], ['2026-09-02', 800, 140]])
})

test('field queue treats connectivity failures as retryable and rejections as final', async () => {
  const { isNetworkError } = await import('../src/lib/fieldQueue.ts')
  assert.equal(isNetworkError(new TypeError('Failed to fetch')), true)
  assert.equal(isNetworkError({ message: 'TypeError: Failed to fetch' }), true)
  assert.equal(isNetworkError({ message: 'new row violates row-level security policy' }), false)
})
