/* Consumption extractor — pure parsing logic (no DOM, no SheetJS).
   Shared by the browser tool (tools/consumption-extract.html) and the
   node tests (tools/test/parser.test.js). */
(function (root) {
'use strict';

/* ---------- cell helpers ---------- */

function normText(v){
  if(v===null || v===undefined) return '';
  if(v instanceof Date) return isNaN(v) ? '' : fmtDate(v);
  return String(v).replace(/\s+/g,' ').trim();
}

// Strict number reader: only cells that really are a number (optionally with a
// currency prefix/suffix, thousands separators or accounting parentheses).
// Deliberately rejects things like "01/01" or "DRFD01" so codes are never
// mistaken for costs.
function toNum(v){
  if(typeof v === 'number') return isFinite(v) ? v : null;
  if(typeof v === 'boolean' || v instanceof Date) return null;
  const s = normText(v);
  if(!s) return null;
  const m = s.match(/^\(?\s*(?:rs\.?|pkr|usd|us\$|\$|₨|€)?\s*(-?\d[\d,]*(?:\.\d+)?)\s*(?:rs\.?|pkr|usd|\/-)?\s*\)?$/i);
  if(!m) return null;
  let n = Number(m[1].replace(/,/g,''));
  if(!isFinite(n)) return null;
  if(/^\(.*\)$/.test(s)) n = -n;
  return n;
}

function colName(c){
  let s='';
  for(c = c+1; c>0; c = Math.floor((c-1)/26)) s = String.fromCharCode(65 + ((c-1)%26)) + s;
  return s;
}
function addr(r,c){ return colName(c) + (r+1); }

function fmtDate(d){
  const p = n => String(n).padStart(2,'0');
  return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate());
}

/* ---------- contract codes ---------- */
// DRFD01            -> OGDCL's own cost
// DRFD01/01         -> Contractor-01 (M/s Schlumberger SAECO Pakistan)
// DRFD01/02, /03 …  -> other contractors: reported separately, never merged in.
const CODE_RE = /DRFD[\s._-]*0*1(?:\s*[\/\\]\s*0*(\d+))?/ig;

const CODE_LABEL = {
  ogdcl: 'DRFD01 (OGDCL)',
  contractor: 'DRFD01/01 (Contractor-01 M/s Schlumberger SAECO Pakistan)'
};

// Returns the strongest code found in a cell: contractor > other > ogdcl.
// A cell reading "DRFD01/01" is never counted as a plain "DRFD01".
function classifyCell(text){
  if(!text) return null;
  const re = new RegExp(CODE_RE.source, 'ig');
  let m, found = null;
  while((m = re.exec(text)) !== null){
    const sub = m[1];
    let code;
    if(sub === undefined) code = 'ogdcl';
    else if(Number(sub) === 1) code = 'contractor';
    else code = 'other';
    const hit = { code: code, sub: sub===undefined ? '' : String(Number(sub)), match: m[0] };
    if(!found) found = hit;
    else if(rank(hit.code) > rank(found.code)) found = hit;
  }
  return found;
}
function rank(c){ return c==='contractor' ? 3 : c==='other' ? 2 : 1; }

/* ---------- dates ---------- */

const MONTHS = {jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,
  jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};

function mk(y,m,d){
  if(!(m>=1 && m<=12) || !(d>=1 && d<=31)) return null;
  if(y < 100) y += y < 70 ? 2000 : 1900;
  if(y < 1990 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, m-1, d));
  if(dt.getUTCMonth() !== m-1 || dt.getUTCDate() !== d) return null;
  const p = n => String(n).padStart(2,'0');
  return y + '-' + p(m) + '-' + p(d);
}

// Reads a date out of free text (a file name, a folder name or a sheet cell).
// dayFirst=true reads 03/04/2025 as 3 April (the local convention).
function parseDateFromText(text, dayFirst){
  const s = normText(text);
  if(!s) return null;
  let m;

  // 2025-01-15 / 2025_01_15 / 20250115
  m = s.match(/(20\d{2})[-_.\/ ]?(\d{1,2})[-_.\/ ]?(\d{1,2})(?!\d)/);
  if(m){ const d = mk(+m[1], +m[2], +m[3]); if(d) return d; }

  // 15-Jan-2025 / 15 January 25
  m = s.match(/(\d{1,2})\s*[-_.\/ ]\s*([A-Za-z]{3,9})\s*[-_.\/ ,]\s*(\d{2,4})/);
  if(m && MONTHS[m[2].toLowerCase()]){ const d = mk(+m[3], MONTHS[m[2].toLowerCase()], +m[1]); if(d) return d; }

  // Jan-15-2025 / January 15, 2025
  m = s.match(/([A-Za-z]{3,9})\s*[-_.\/ ]\s*(\d{1,2})\s*[-_.\/ ,]+\s*(\d{2,4})/);
  if(m && MONTHS[m[1].toLowerCase()]){ const d = mk(+m[3], MONTHS[m[1].toLowerCase()], +m[2]); if(d) return d; }

  // 15-01-2025 / 15.01.25 (or month-first when dayFirst is off)
  m = s.match(/(\d{1,2})\s*[-_.\/]\s*(\d{1,2})\s*[-_.\/]\s*(\d{2,4})(?!\d)/);
  if(m){
    const a = +m[1], b = +m[2], y = +m[3];
    let d = null;
    if(a > 12) d = mk(y, b, a);
    else if(b > 12) d = mk(y, a, b);
    else d = dayFirst ? mk(y, b, a) : mk(y, a, b);
    if(d) return d;
  }

  // 150125 / 15012025 as a standalone run of digits (last resort)
  m = s.match(/(?:^|[^\d])(\d{2})(\d{2})(\d{2}|\d{4})(?!\d)/);
  if(m){
    const a = +m[1], b = +m[2], y = +m[3];
    let d = (a > 12) ? mk(y, b, a) : (dayFirst ? mk(y, b, a) : mk(y, a, b));
    if(d) return d;
  }
  return null;
}

const DATE_LABEL_RE = /^(report\s*date|date\s*of\s*report|dated|date)\s*[:.\-]?\s*$/i;
const DATE_INLINE_RE = /^(?:report\s*)?date[d]?\s*[:.\-]\s*(.+)$/i;
const DATE_SKIP_RE   = /(spud|rig\s*release|completion|prev|previous|last|start|end|commence|tender|contract)/i;

// Finds the report date inside the sheet itself (top rows only — later date
// cells are usually spud/completion dates, not the report date).
function findSheetDate(grid, dayFirst, maxRows){
  const limit = Math.min(grid.length, maxRows || 25);
  for(let r=0; r<limit; r++){
    const row = grid[r] || [];
    for(let c=0; c<row.length; c++){
      const t = row[c] ? row[c].t : '';
      if(!t || DATE_SKIP_RE.test(t)) continue;
      let inline = t.match(DATE_INLINE_RE);
      if(inline){
        const d = parseDateFromText(inline[1], dayFirst);
        if(d) return { date: d, addr: addr(r,c) };
      }
      if(DATE_LABEL_RE.test(t)){
        for(let j=c+1; j<Math.min(row.length, c+6); j++){
          const nb = row[j];
          if(!nb || (!nb.t && nb.n===null)) continue;
          const d = (nb.v instanceof Date && !isNaN(nb.v)) ? fmtDate(nb.v) : parseDateFromText(nb.t, dayFirst);
          if(d) return { date: d, addr: addr(r,j) };
          break;
        }
        const below = (grid[r+1] || [])[c];
        if(below){
          const d = (below.v instanceof Date && !isNaN(below.v)) ? fmtDate(below.v) : parseDateFromText(below.t, dayFirst);
          if(d) return { date: d, addr: addr(r+1,c) };
        }
      }
    }
  }
  return null;
}

/* ---------- grid + cost columns ---------- */

function buildGrid(rows){
  return (rows||[]).map(row => (row||[]).map(v => ({ v: v, t: normText(v), n: toNum(v) })));
}

const COST_KEYWORDS = [
  [/\btotal\s*cost\b/i, 6], [/\bcost\b/i, 5], [/\bamount\b/i, 5],
  [/\bvalue\b/i, 3], [/\bexpenditure\b/i, 3], [/\bprice\b/i, 2],
  [/\b(pkr|usd|rs\.?)\b/i, 2], [/\btotal\b/i, 1]
];
const CUMULATIVE_RE = /(cumulat|c\s*\/?\s*to\s*d|to\s*date|inception|previous|prev\b|balance|stock|closing|opening|received|qty|quantity|unit|rate)/i;
const TODAY_RE = /(today|daily|day'?s|24\s*hrs|current\s*day)/i;

// Scores every column by how much its header text looks like a cost column.
// Cumulative / quantity / rate columns score negative so a "Cost (Cumulative)"
// column never wins over "Cost (Today)".
function costColumns(grid){
  const scores = {};
  for(let r=0; r<grid.length; r++){
    const row = grid[r] || [];
    for(let c=0; c<row.length; c++){
      const cell = row[c];
      if(!cell || !cell.t || cell.n !== null || cell.t.length > 60) continue;
      let s = 0, hit = false;
      COST_KEYWORDS.forEach(function(k){ if(k[0].test(cell.t)){ s = Math.max(s, k[1]); hit = true; } });
      if(!hit) continue;
      if(TODAY_RE.test(cell.t)) s += 3;
      if(CUMULATIVE_RE.test(cell.t)) s = -10;
      scores[c] = (scores[c] === undefined) ? s : Math.max(scores[c], s);
    }
  }
  // A column whose header mentions cumulative/qty anywhere stays excluded.
  for(let r=0; r<grid.length; r++){
    const row = grid[r] || [];
    for(let c=0; c<row.length; c++){
      const cell = row[c];
      if(cell && cell.t && cell.n === null && cell.t.length <= 60 && CUMULATIVE_RE.test(cell.t) && scores[c] !== undefined) scores[c] = -10;
    }
  }
  return scores;
}

const TOTAL_RE = /^(grand\s*)?total\b|^\s*sub\s*total\b|\btotal\s*(cost|amount|expenditure)\b/i;

function rowIsTotal(grid, r){
  const row = grid[r] || [];
  return row.some(function(cell){ return cell && cell.n === null && TOTAL_RE.test(cell.t); });
}
function rowHasCode(grid, r, exceptCol){
  const row = grid[r] || [];
  return row.some(function(cell, c){ return c !== exceptCol && cell && cell.t && classifyCell(cell.t); });
}

/* ---------- the three extraction strategies ---------- */

// 1) The code sits on a data row: take the cost column's value on that row.
function valueFromRow(grid, r, c, scores){
  const row = grid[r] || [];
  let best = null;
  for(let j=0; j<row.length; j++){
    if(j === c) continue;
    const cell = row[j];
    if(!cell || cell.n === null) continue;
    const s = scores[j] === undefined ? 0 : scores[j];
    if(s < 0) continue;
    const cand = { s: s, j: j, n: cell.n, right: j > c };
    if(!best) best = cand;
    else if(cand.s > best.s) best = cand;
    else if(cand.s === best.s){
      if(cand.right && !best.right) best = cand;
      else if(cand.right === best.right && cand.j > best.j) best = cand;
    }
  }
  if(!best) return null;
  return { value: best.n, method: 'row value' + (scores[best.j] > 0 ? ' (cost column)' : ''), addr: addr(r, best.j) };
}

// 2) The code is a column header: prefer that column's TOTAL row, else sum it.
function valueFromColumn(grid, r, c){
  for(let i=r+1; i<grid.length; i++){
    const cell = (grid[i] || [])[c];
    if(cell && cell.n !== null && rowIsTotal(grid, i)) return { value: cell.n, method: 'column total row', addr: addr(i,c) };
  }
  let sum = 0, count = 0, blank = 0;
  for(let i=r+1; i<grid.length; i++){
    const row = grid[i] || [];
    const cell = row[c];
    const empty = !cell || (cell.t === '' && cell.n === null);
    if(empty){ blank++; if(blank >= 3 && count) break; continue; }
    blank = 0;
    if(cell.n !== null && !rowIsTotal(grid, i)){ sum += cell.n; count++; }
  }
  return count ? { value: sum, method: 'column sum (' + count + ' cells)', addr: colName(c) + (r+2) + ':' + colName(c) + grid.length } : null;
}

// 3) The code is a section heading: use the section's TOTAL row.
function valueFromSection(grid, r, c, scores){
  for(let i=r+1; i<grid.length; i++){
    if(rowHasCode(grid, i, -1)) break;            // next section starts
    if(rowIsTotal(grid, i)){
      const v = valueFromRow(grid, i, -1, scores);
      if(v) return { value: v.value, method: 'section total row', addr: v.addr };
    }
  }
  return null;
}

/* ---------- sheet scan ---------- */

function scanSheet(rows, sheetName){
  const grid = buildGrid(rows);
  const scores = costColumns(grid);
  const hits = [], others = [];
  for(let r=0; r<grid.length; r++){
    const row = grid[r] || [];
    for(let c=0; c<row.length; c++){
      const cell = row[c];
      if(!cell || !cell.t) continue;
      const k = classifyCell(cell.t);
      if(!k) continue;
      if(k.code === 'other'){
        others.push({ sheet: sheetName, addr: addr(r,c), text: cell.t, code: 'DRFD01/' + String(k.sub).padStart(2,'0') });
        continue;
      }
      const headerish = rowHasCode(grid, r, c) || valueFromRow(grid, r, c, scores) === null;
      let got = null;
      if(!headerish) got = valueFromRow(grid, r, c, scores);
      if(!got) got = valueFromColumn(grid, r, c);
      if(!got) got = valueFromSection(grid, r, c, scores);
      if(!got){
        others.push({ sheet: sheetName, addr: addr(r,c), text: cell.t, code: CODE_LABEL[k.code], noValue: true });
        continue;
      }
      hits.push({
        code: k.code, sheet: sheetName, codeAddr: addr(r,c), text: cell.t,
        value: got.value, method: got.method, addr: got.addr, isTotal: rowIsTotal(grid, r) || /total/i.test(got.method)
      });
    }
  }
  return { grid: grid, hits: hits, others: others };
}

// Collapses several hits for one code into a single figure. A TOTAL row always
// beats the line items it sums, so nothing is double counted.
function reduceHits(hits){
  if(!hits.length) return null;
  const totals = hits.filter(function(h){ return h.isTotal; });
  const use = totals.length ? totals : hits;
  const value = use.reduce(function(a,h){ return a + h.value; }, 0);
  return { value: value, used: use, note: use.length > 1 ? (use.length + ' matches summed') : '' };
}

/* ---------- workbook level ---------- */

// sheets: [{ name, rows }] — rows are arrays of raw cell values.
function extractWorkbook(sheets, opts){
  opts = opts || {};
  const dayFirst = opts.dayFirst !== false;
  const filter = (opts.sheetFilter || '').trim().toLowerCase();
  const wanted = [], skippedSheets = [];
  (sheets || []).forEach(function(sh){
    if(!filter || String(sh.name||'').toLowerCase().indexOf(filter) !== -1) wanted.push(sh);
    else skippedSheets.push(sh);
  });
  // No sheet matched the filter → fall back to every sheet so a differently
  // named consumption tab is still picked up.
  const pool = wanted.length ? wanted : skippedSheets;
  const scanned = pool.map(function(sh){
    const res = scanSheet(sh.rows, sh.name);
    const codes = new Set(res.hits.map(function(h){ return h.code; }));
    return { name: sh.name, res: res, codeCount: codes.size, hitCount: res.hits.length,
             named: filter ? String(sh.name||'').toLowerCase().indexOf(filter) !== -1 : false };
  });
  const candidates = scanned.filter(function(s){ return s.hitCount > 0; });
  candidates.sort(function(a,b){
    return (b.codeCount - a.codeCount) || (b.named - a.named) || (b.hitCount - a.hitCount);
  });

  const best = candidates[0] || null;
  const notes = [];
  if(candidates.length > 1) notes.push('also matched: ' + candidates.slice(1).map(function(s){ return s.name; }).join(', '));

  let date = null, dateSrc = '';
  for(const s of (best ? [best].concat(scanned.filter(x=>x!==best)) : scanned)){
    const d = findSheetDate(s.res.grid, dayFirst);
    if(d){ date = d.date; dateSrc = 'sheet ' + s.name + '!' + d.addr; break; }
  }
  if(!date && opts.fileName){
    const d = parseDateFromText(opts.fileName, dayFirst);
    if(d){ date = d; dateSrc = 'file name'; }
  }
  if(!date && opts.folderPath){
    const d = parseDateFromText(opts.folderPath, dayFirst);
    if(d){ date = d; dateSrc = 'folder name'; }
  }
  if(!date && opts.modified){
    const dt = new Date(opts.modified);
    if(!isNaN(dt)){ date = fmtDate(dt); dateSrc = 'file modified date'; }
  }

  const hits = best ? best.res.hits : [];
  const ogdcl = reduceHits(hits.filter(function(h){ return h.code === 'ogdcl'; }));
  const contractor = reduceHits(hits.filter(function(h){ return h.code === 'contractor'; }));
  if(ogdcl && ogdcl.note) notes.push('DRFD01: ' + ogdcl.note);
  if(contractor && contractor.note) notes.push('DRFD01/01: ' + contractor.note);
  const others = [].concat.apply([], scanned.map(function(s){ return s.res.others; }));
  const otherCodes = Array.from(new Set(others.filter(function(o){ return !o.noValue; }).map(function(o){ return o.code; })));
  if(otherCodes.length) notes.push('other codes present (not included): ' + otherCodes.join(', '));
  if(!ogdcl) notes.push('no DRFD01 cost found');
  if(!contractor) notes.push('no DRFD01/01 cost found');

  const evidence = [];
  [['ogdcl', ogdcl], ['contractor', contractor]].forEach(function(pair){
    if(!pair[1]) return;
    pair[1].used.forEach(function(h){
      evidence.push({ code: CODE_LABEL[pair[0]], sheet: h.sheet, codeCell: h.codeAddr, matchedText: h.text,
                      valueCell: h.addr, value: h.value, method: h.method });
    });
  });
  others.forEach(function(o){
    evidence.push({ code: o.code + (o.noValue ? ' (no cost found)' : ' (ignored)'), sheet: o.sheet,
                    codeCell: o.addr, matchedText: o.text, valueCell: '', value: '', method: 'not included' });
  });

  return {
    matched: !!(ogdcl || contractor),
    sheet: best ? best.name : '',
    date: date, dateSrc: dateSrc,
    ogdcl: ogdcl ? ogdcl.value : null,
    contractor: contractor ? contractor.value : null,
    notes: notes.join('; '),
    evidence: evidence
  };
}

// One row per date; several reports on the same date are added together.
function groupByDate(records){
  const map = new Map();
  records.forEach(function(rec){
    const key = rec.date || 'Unknown date';
    if(!map.has(key)) map.set(key, { date: rec.date || '', files: [], sheets: [], ogdcl: null, contractor: null, notes: [], dateSrc: [] });
    const g = map.get(key);
    g.files.push(rec.file);
    if(rec.sheet) g.sheets.push(rec.sheet);
    if(rec.ogdcl !== null) g.ogdcl = (g.ogdcl || 0) + rec.ogdcl;
    if(rec.contractor !== null) g.contractor = (g.contractor || 0) + rec.contractor;
    if(rec.notes) g.notes.push(rec.notes);
    if(rec.dateSrc) g.dateSrc.push(rec.dateSrc);
  });
  const out = Array.from(map.values()).map(function(g){
    return {
      date: g.date, file: g.files.join(' | '), sheet: Array.from(new Set(g.sheets)).join(', '),
      dateSrc: Array.from(new Set(g.dateSrc)).join(', '),
      ogdcl: g.ogdcl, contractor: g.contractor,
      notes: Array.from(new Set(g.notes)).join('; '),
      fileCount: g.files.length
    };
  });
  return sortByDate(out);
}

function sortByDate(rows){
  return rows.slice().sort(function(a,b){
    if(!a.date && !b.date) return 0;
    if(!a.date) return 1;
    if(!b.date) return -1;
    return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
  });
}

const API = {
  normText: normText, toNum: toNum, addr: addr, colName: colName, fmtDate: fmtDate,
  classifyCell: classifyCell, parseDateFromText: parseDateFromText, findSheetDate: findSheetDate,
  buildGrid: buildGrid, costColumns: costColumns, scanSheet: scanSheet,
  extractWorkbook: extractWorkbook, groupByDate: groupByDate, sortByDate: sortByDate,
  CODE_LABEL: CODE_LABEL
};

if(typeof module !== 'undefined' && module.exports) module.exports = API;
root.ConsumptionParser = API;

})(typeof globalThis !== 'undefined' ? globalThis : this);
