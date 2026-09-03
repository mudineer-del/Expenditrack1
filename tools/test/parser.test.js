/* node tools/test/parser.test.js — layout coverage for the consumption extractor. */
const P = require('../src/parser.js');

let pass = 0, fail = 0;
function eq(actual, expected, label){
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if(a === e){ pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + '\n       expected ' + e + '\n       actual   ' + a); }
}
function group(name){ console.log('\n' + name); }

/* ---- cell readers ---- */
group('cell readers');
eq(P.toNum('1,234.50'), 1234.5, 'thousands separator');
eq(P.toNum('PKR 8,000'), 8000, 'currency prefix');
eq(P.toNum('(500)'), -500, 'accounting negative');
eq(P.toNum('01/01'), null, 'sub-code is not a number');
eq(P.toNum('DRFD01'), null, 'contract code is not a number');
eq(P.toNum(''), null, 'blank');

group('code classification');
eq(P.classifyCell('DRFD01').code, 'ogdcl', 'plain DRFD01');
eq(P.classifyCell('DRFD01/01').code, 'contractor', 'DRFD01/01 is not DRFD01');
eq(P.classifyCell('Contract No. DRFD-01 / 01 (M/s Schlumberger SAECO Pakistan)').code, 'contractor', 'spaced + dashed variant');
eq(P.classifyCell('DRFD01/02').code, 'other', 'other sub-contract');
eq(P.classifyCell('Barite 25kg'), null, 'no code');

group('date parsing');
eq(P.parseDateFromText('DDR Kal-04 15-01-2025.xlsx', true), '2025-01-15', 'day-first dd-mm-yyyy');
eq(P.parseDateFromText('Daily Report 2025_02_03.xls', true), '2025-02-03', 'yyyy-mm-dd');
eq(P.parseDateFromText('Kal-04 DR 17-Mar-2025.xlsx', true), '2025-03-17', 'dd-Mon-yyyy');
eq(P.parseDateFromText('Report April 5, 2025.xlsx', true), '2025-04-05', 'Month d, yyyy');
eq(P.parseDateFromText('DR 250125.xls', true), '2025-01-25', 'ddmmyy run');
eq(P.parseDateFromText('Kal-04 rig report.xlsx', true), null, 'no date present');

/* ---- layout 1: line items in rows, today vs cumulative cost columns ---- */
group('layout 1 — row per contract, Today / Cumulative cost columns');
const l1 = [[ 'OGDCL — DRILLING FLUIDS DAILY REPORT' ],
  ['Well:', 'Kal-04', '', 'Date:', '15-01-2025'],
  [],
  ['Sr', 'Contract No', 'Description', 'Qty', 'Rate', 'Cost (Today)', 'Cost (Cumulative)'],
  [1, 'DRFD01', 'Barite 25 kg', 10, 100, 1000, 50000],
  [2, 'DRFD01/01', 'Mud engineering services', 1, 2500, 2500, 90000]];
let r1 = P.extractWorkbook([{ name: 'Consumption', rows: l1 }], { fileName: 'DDR.xlsx' });
eq([r1.date, r1.ogdcl, r1.contractor], ['2025-01-15', 1000, 2500], 'date + both costs from Today column');
eq(r1.dateSrc, 'sheet Consumption!E2', 'date read from the sheet');

/* ---- layout 2: codes as column headers with a TOTAL row ---- */
group('layout 2 — codes as column headers, TOTAL row');
const l2 = [['CHEMICAL CONSUMPTION SHEET'],
  ['Date:', '16-Jan-2025'],
  [],
  ['Material', 'DRFD01 Cost', 'DRFD01/01 Cost'],
  ['Barite', 500, 0],
  ['Gel', 300, 200],
  ['TOTAL', 800, 200]];
let r2 = P.extractWorkbook([{ name: 'Consumption', rows: l2 }], { fileName: 'x.xlsx' });
eq([r2.date, r2.ogdcl, r2.contractor], ['2025-01-16', 800, 200], 'column totals, not double counted');

/* ---- layout 3: one section per contract, each with its own total ---- */
group('layout 3 — sections with per-section totals');
const l3 = [['CONSUMPTION — KAL-04'],
  ['Report Date', '17/01/2025'],
  [],
  ['DRFD01 (OGDCL supplied material)'],
  ['Item', 'Qty', 'Amount'],
  ['Caustic Soda', 5, 700],
  ['Soda Ash', 2, 500],
  ['Total', '', 1200],
  [],
  ['DRFD01/01 (Contractor-01 M/s Schlumberger SAECO Pakistan)'],
  ['Item', 'Qty', 'Amount'],
  ['Polymer', 4, 3000],
  ['Lubricant', 1, 400],
  ['Total', '', 3400]];
let r3 = P.extractWorkbook([{ name: 'Daily Consumption', rows: l3 }], { fileName: 'x.xlsx' });
eq([r3.date, r3.ogdcl, r3.contractor], ['2025-01-17', 1200, 3400], 'section totals picked up');

/* ---- layout 4: no date in sheet, date comes from the file name ---- */
group('layout 4 — date falls back to file name, extra contractor ignored');
const l4 = [['Contract', 'Description', 'Cost'],
  ['DRFD01', 'OGDCL material', 4000],
  ['DRFD01/01', 'Schlumberger SAECO services', 6000],
  ['DRFD01/02', 'Contractor-02 services', 999]];
let r4 = P.extractWorkbook([{ name: 'Consumption', rows: l4 }], { fileName: 'Kal-04 DDR 18-01-2025.xlsx' });
eq([r4.date, r4.dateSrc, r4.ogdcl, r4.contractor], ['2025-01-18', 'file name', 4000, 6000], 'file-name date, /02 excluded');
eq(/DRFD01\/02/.test(r4.notes), true, 'other code flagged in notes');

/* ---- sheet selection + workbooks with nothing to take ---- */
group('workbook handling');
const cover = [['OGDCL'], ['Well Kal-04'], ['Prepared by: DF Engineer']];
let r5 = P.extractWorkbook([{ name: 'Cover', rows: cover }, { name: 'Consumption', rows: l1 }], { fileName: 'x.xlsx' });
eq([r5.sheet, r5.ogdcl, r5.contractor], ['Consumption', 1000, 2500], 'picks the consumption sheet');
let r6 = P.extractWorkbook([{ name: 'Cover', rows: cover }], { fileName: 'x.xlsx' });
eq(r6.matched, false, 'workbook with no codes is not matched');
let r7 = P.extractWorkbook([{ name: 'Sheet1', rows: l4 }], { fileName: 'DR 19-01-2025.xls', sheetFilter: 'consum' });
eq([r7.ogdcl, r7.contractor], [4000, 6000], 'falls back to other sheets when the filter matches none');

/* ---- date-wise grouping ---- */
group('grouping by date');
const grouped = P.groupByDate([
  { date: '2025-01-16', file: 'b.xlsx', sheet: 'Consumption', dateSrc: 'file name', ogdcl: 100, contractor: 200, notes: '' },
  { date: '2025-01-15', file: 'a.xlsx', sheet: 'Consumption', dateSrc: 'file name', ogdcl: 10, contractor: 20, notes: '' },
  { date: '2025-01-15', file: 'a2.xlsx', sheet: 'Consumption', dateSrc: 'file name', ogdcl: 5, contractor: null, notes: '' }
]);
eq(grouped.map(g => [g.date, g.ogdcl, g.contractor]), [['2025-01-15', 15, 20], ['2025-01-16', 100, 200]], 'summed per date, sorted');
eq(grouped[0].fileCount, 2, 'file count per date');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
