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

test('DMR reads the report date from the filename and retains OGDCL sub-header cost', async () => {
  const result = await parseDmrFiles([report('20-Aug-26', { name: '2026-08-21-report.xlsx' })])
  assert.deepEqual(result.errors, [])
  assert.equal(result.rows.length, 2)
  // The first report is the opening balance, so OGDCL posts its cumulative.
  assert.equal(result.rows.find(r => r.contractor === 'OGDCL').amount, 200)
  assert.ok(result.rows.every(r => r.entryDate === '2026-08-21'))
})

test('DMR supports dates without filename prefixes and reports unreadable workbooks', async () => {
  const result = await parseDmrFiles([report('1-Sep-26'), new File(['invalid'], 'bad.xlsx')])
  assert.equal(result.rows[0].entryDate, '2026-09-01')
  assert.equal(result.errors.length, 1)
})

test('DMR day to day: each SLB amount is the change in cumulative, and a conflicting duplicate date is reported', async () => {
  const result = await parseDmrFiles([
    report('1-Sep-26', { cumulative: 100 }),
    report('1-Sep-26', { cumulative: 110, name: 'duplicate.xlsx' }),
    report('4-Sep-26', { cumulative: 140 }),
  ])
  const slb = result.rows.filter(r => r.contractor === 'MUD_CONTRACTOR').sort((a, b) => a.entryDate.localeCompare(b.entryDate))
  assert.deepEqual(slb.map(r => [r.entryDate, r.amount]), [['2026-09-01', 100], ['2026-09-04', 40]])
  assert.deepEqual(result.errors.map(e => e.fileName), ['duplicate.xlsx'])
  // Day to day replaces the lump-sum reconciliation suggestion.
  assert.deepEqual(result.reconciliations, [])
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
  // Day to day posts the change in cumulative (here 130 - 100 = 30 on 2 Sep), not the daily cell,
  // so the mismatch check has nothing left to flag.
  const bad = await parseDmrFiles([day1, day2bad])
  assert.equal(bad.rows.find(r => r.contractor === 'MUD_CONTRACTOR' && r.entryDate === '2026-09-02').amount, 30)
  assert.deepEqual(bad.cumulativeChecks, [])
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

test('well names match across spelling, punctuation and leading zeros', async () => {
  const { normalizeWellName } = await import('../src/lib/wellNames.ts')
  assert.equal(normalizeWellName('Uch WDW-01'), normalizeWellName('UCH WDW-1'))
  assert.equal(normalizeWellName('Gurgalot X-1'), normalizeWellName('gurgalot x 1'))
  assert.notEqual(normalizeWellName('Kal-04'), normalizeWellName('Kal-14'))
})

test('AFE WBS code and budget are imported for drilling and completion centres unless overridden', async () => {
  const { afeCodeFor, applyAfeBudgets } = await import('../src/lib/wellCostBudgets.ts')
  const afes = [{
    id: 'a1', wellId: 'w1', afeType: 'Original', currency: 'USD', preferredCurrency: 'USD', conversionRate: '', converted: false,
    lines: [
      { id: 'l1', code: '21014AW004D2601-DRFD01', description: 'Drilling fluid', estimate: 1000, contingency: 0 },
      { id: 'l2', code: '21014AW004D2601-DRFC01', description: 'Completion fluid', estimate: 500, contingency: 100 },
    ],
  }]
  const centre = (over) => ({
    id: 'c', wellId: 'w1', departmentId: 'd', serviceCategoryId: 's', costCentre: 'DRFC01', fundCentre: '',
    description: '', plannedBudget: 0, budgetOverride: '', descriptionOverride: '', currency: 'USD', ...over,
  })

  // Blank fund centre picks up the completion code from the AFE.
  assert.equal(afeCodeFor(afes, 'w1', 'DRFC01', ''), '21014AW004D2601-DRFC01')
  // A fund centre with a different well prefix still follows the AFE line for its cost code.
  assert.equal(afeCodeFor(afes, 'w1', 'DRFC01', '22040AW001E2603-DRFC01'), '21014AW004D2601-DRFC01')
  assert.equal(afeCodeFor(afes, 'w1', 'DRFC09', ''), '')

  const [applied] = applyAfeBudgets([centre({})], afes)
  assert.equal(applied.fundCentre, '21014AW004D2601-DRFC01')
  assert.equal(applied.plannedBudget, 600)

  // A budget typed on the centre still wins over the AFE.
  const [overridden] = applyAfeBudgets([centre({ budgetOverride: 250 })], afes)
  assert.equal(overridden.plannedBudget, 250)

  // Drilling works the same way.
  const [drilling] = applyAfeBudgets([centre({ costCentre: 'DRFD01' })], afes)
  assert.equal(drilling.fundCentre, '21014AW004D2601-DRFD01')
  assert.equal(drilling.plannedBudget, 1000)
})

// Builds a DMR-sheet-only report (no WBM/OBM sheet) with the Eng / Prod cost block.
function dmrSheetReport({ fileName, date, well = 'TEST WELL-1', slbDaily = 0, slbCum = '', ogdclDaily = '', ogdclCum = '', midgardCum = '' }) {
  const rows = [
    ['Well Name :', well],
    [],
    ['', '', '', '', '', '', '', 'Date :', date],
    [],
    ['M-I Engineer', 'Phone', 'email', '', 'Whse Phone', 'Rig Phone', 'Eng / Prod cost', '', 'Daily/Cum  Cost'],
    ['Majid Hussain', '', '', '', '', '', '', '', ''],
    ['Muhammad Haroon Khan', '', '', '', '', '', slbDaily, '', slbCum],
    ['', '', '', '', '', 'Ogdcl Cost', ogdclDaily, '', ogdclCum],
    ['', '', '', '', '', 'Midgard Cost', '', '', midgardCum],
    ['', '', '', '', '', 'Total Cost', '', '', ''],
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'DMR')
  return new File([XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })], fileName)
}

test('DMR: OGDCL is read from the DMR sheet when the OBM sheet has no OGDCL line, and the first report starts the OGDCL series', async () => {
  const { parseDmrFiles } = await import('../src/lib/dmrImport.ts')
  const obm = [
    ['Well Name :', 'CHAKAR DEEP-01', '', '', '', '', '', 'Date :', '10-Oct-26'],
    ['', '', '', '', '', 'Daily cost', '', 'Cumulative Cost'],
    ['Majid Hussain', '', '', '', '', '$2,437.10', '', '$133,243.15'],
  ]
  const dmr = [
    ['Well Name :', 'CHAKAR DEEP-01'],
    [],
    ['', '', '', '', '', 'Ogdcl Cost', '3016.93', '', '63953.25'],
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(obm), 'OBM')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dmr), 'DMR')
  const file = new File([XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })], 'DMR#14_Well CHAKAR DEEP-1 2026-10-10.xlsx')

  const result = await parseDmrFiles([file])
  assert.deepEqual(result.errors, [])
  const ogdcl = result.rows.find((r) => r.contractor === 'OGDCL' && r.entryDate === '2026-10-10')
  // A single report is its own opening balance, so its OGDCL amount is its cumulative.
  assert.equal(ogdcl.amount, 63953.25)
  assert.equal(ogdcl.cumulative, 63953.25)
  // Opening balance: the SLB cumulative of the single report.
  assert.equal(result.rows.find((r) => r.contractor === 'MUD_CONTRACTOR').amount, 133243.15)
  assert.equal(result.rows.find((r) => r.sourceLabel === 'OGDCL catch-up'), undefined)
  const midgard = result.rows.find((r) => r.sourceLabel === 'Midgard catch-up')
  assert.equal(midgard.contractor, 'SECOND_CONTRACTOR')
  assert.equal(midgard.entryDate, '2026-10-08')
  assert.equal(midgard.amount, 11315.37)
  assert.equal(midgard.cumulative, null)
})

test('DMR: a report with only the DMR sheet imports SLB from the engineer rows, OGDCL and a Midgard gap', async () => {
  const { parseDmrFiles } = await import('../src/lib/dmrImport.ts')
  const file = dmrSheetReport({ fileName: 'DMR#1_Well TEST WELL-1 2026-09-27.xlsx', date: '9/30/26', slbDaily: 31995.4, slbCum: '67507.95', ogdclDaily: '24723.39', ogdclCum: '24723.39', midgardCum: '11315.37' })
  const result = await parseDmrFiles([file])
  assert.deepEqual(result.errors, [])
  assert.equal(result.rows.find((r) => r.contractor === 'MUD_CONTRACTOR').entryDate, '2026-09-27')
  assert.equal(result.rows.find((r) => r.contractor === 'MUD_CONTRACTOR').amount, 67507.95)
  assert.equal(result.rows.find((r) => r.contractor === 'MUD_CONTRACTOR').cumulative, 67507.95)
  assert.equal(result.rows.find((r) => r.contractor === 'OGDCL').amount, 24723.39)
  assert.ok(result.gaps.some((g) => g.contractor === 'SECOND_CONTRACTOR' && g.cumulativeOnFile === '11315.37'))
})

test('DMR: OGDCL day to day is the change in cumulative; a report that goes back is left out and reported', async () => {
  const { parseDmrFiles } = await import('../src/lib/dmrImport.ts')
  const files = [
    dmrSheetReport({ fileName: 'a.xlsx', date: '10/1/26', ogdclDaily: '100', ogdclCum: '100' }),
    dmrSheetReport({ fileName: 'b.xlsx', date: '10/2/26', ogdclDaily: '', ogdclCum: '150' }),
    dmrSheetReport({ fileName: 'c.xlsx', date: '10/3/26', ogdclDaily: '5', ogdclCum: '120' }),
    dmrSheetReport({ fileName: 'd.xlsx', date: '10/4/26', ogdclDaily: '', ogdclCum: '175' }),
  ]
  const result = await parseDmrFiles(files)
  const ogdcl = result.rows.filter((r) => r.contractor === 'OGDCL').sort((a, b) => a.entryDate.localeCompare(b.entryDate))
  assert.deepEqual(ogdcl.map((r) => [r.entryDate, r.amount]), [['2026-10-01', 100], ['2026-10-02', 50], ['2026-10-04', 25]])
  // The chain adds up to the latest cumulative.
  assert.equal(ogdcl.reduce((s, r) => s + r.amount, 0), 175)
  assert.deepEqual(result.errors.map((e) => e.fileName), ['c.xlsx'])
})

test('S-curve by WBS: running actual per code, only codes with actual, line stops at last actual', async () => {
  const { actualCurvesByWbs, wbsCurveValueAt } = await import('../src/lib/projection.ts')
  const tx = [
    { costCentreId: 'c1', kind: 'actual', entryDate: '2026-10-01', amount: 100 },
    { costCentreId: 'c2', kind: 'actual', entryDate: '2026-10-01', amount: 50 },
    { costCentreId: 'c1', kind: 'actual', entryDate: '2026-10-03', amount: 25 },
    { costCentreId: 'c1', kind: 'commitment', entryDate: '2026-10-04', amount: 999 },
    { costCentreId: 'c3', kind: 'actual', entryDate: '2026-10-02', amount: 10 },
  ]
  const curves = actualCurvesByWbs(tx, new Map([['c1', 'WBS-A'], ['c2', 'WBS-A'], ['c3', '']]))
  assert.equal(curves.length, 1)
  assert.equal(curves[0].code, 'WBS-A')
  assert.equal(curves[0].total, 175)
  assert.equal(wbsCurveValueAt(curves[0], '2026-10-01'), 150)
  assert.equal(wbsCurveValueAt(curves[0], '2026-10-02'), 150)
  assert.equal(wbsCurveValueAt(curves[0], '2026-10-03'), 175)
  assert.equal(wbsCurveValueAt(curves[0], '2026-10-04'), undefined)
  assert.equal(wbsCurveValueAt(curves[0], '2026-09-30'), undefined)
})
