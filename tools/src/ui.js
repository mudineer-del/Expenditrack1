/* Browser glue for the consumption extractor: file pickers, workbook reading,
   result rendering and the Excel/CSV export. Parsing itself lives in parser.js. */
(function(){
'use strict';
var P = window.ConsumptionParser;
var $ = function(id){ return document.getElementById(id); };
var EXT = /\.(xlsx|xlsm|xlsb|xls|csv|xml|html?)$/i;
var IGNORE = /(^|\/)(~\$|\.)/;            // Excel lock files and dot-files

var state = { files: [], rows: [], perFile: [], evidence: [], skipped: [] };

/* ---------- picking files ---------- */

function addFiles(list){
  var added = 0;
  for(var i=0; i<list.length; i++){
    var f = list[i];
    var path = f.webkitRelativePath || f._path || f.name;
    if(!EXT.test(f.name) || IGNORE.test(path) || IGNORE.test(f.name)) continue;
    if(state.files.some(function(x){ return (x.path === path) && x.file.size === f.size; })) continue;
    state.files.push({ file: f, path: path, name: f.name });
    added++;
  }
  refreshHint();
  return added;
}

function refreshHint(){
  var n = state.files.length;
  $('run').disabled = !n;
  $('fileHint').textContent = n
    ? (n + ' report file' + (n===1?'':'s') + ' ready — ' + shortList(state.files.map(function(f){ return f.name; })))
    : 'No files selected yet.';
}
function shortList(names){
  if(names.length <= 3) return names.join(', ');
  return names.slice(0,3).join(', ') + ' … +' + (names.length-3) + ' more';
}

// Folder drag & drop (Chrome/Edge): walk the dropped directory tree.
function walkEntry(entry, prefix, out){
  return new Promise(function(resolve){
    if(entry.isFile){
      entry.file(function(f){ f._path = prefix + f.name; out.push(f); resolve(); }, function(){ resolve(); });
    } else if(entry.isDirectory){
      var reader = entry.createReader(), all = [];
      var readBatch = function(){
        reader.readEntries(function(batch){
          if(!batch.length){
            Promise.all(all.map(function(e){ return walkEntry(e, prefix + entry.name + '/', out); })).then(resolve);
            return;
          }
          all = all.concat(batch); readBatch();
        }, function(){ resolve(); });
      };
      readBatch();
    } else resolve();
  });
}

/* ---------- reading a workbook ---------- */

function readWorkbook(file){
  return file.arrayBuffer().then(function(buf){
    var wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true, cellText: false });
    return wb.SheetNames.map(function(name){
      var ws = wb.Sheets[name];
      // blankrows:true keeps row numbers aligned with the real cell addresses
      var rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: true, defval: '', raw: true });
      return { name: name, rows: rows };
    });
  });
}

/* ---------- the run ---------- */

function run(){
  var opts = {
    sheetFilter: $('sheetFilter').value,
    dayFirst: $('dayFirst').checked
  };
  state.rows = []; state.perFile = []; state.evidence = []; state.skipped = [];
  var bar = $('bar'); bar.className = 'bar on';
  var i = 0, total = state.files.length;

  var step = function(){
    if(i >= total){
      bar.className = 'bar';
      finish();
      return;
    }
    var entry = state.files[i++];
    bar.firstChild.style.width = Math.round(i/total*100) + '%';
    readWorkbook(entry.file).then(function(sheets){
      var folder = entry.path.indexOf('/') !== -1 ? entry.path.slice(0, entry.path.lastIndexOf('/')) : '';
      var res = P.extractWorkbook(sheets, {
        sheetFilter: opts.sheetFilter, dayFirst: opts.dayFirst,
        fileName: entry.name, folderPath: folder, modified: entry.file.lastModified
      });
      if(res.matched){
        state.perFile.push({
          date: res.date, dateSrc: res.dateSrc, file: entry.path, sheet: res.sheet,
          ogdcl: res.ogdcl, contractor: res.contractor, notes: res.notes
        });
      } else {
        state.skipped.push({ file: entry.path, reason: 'no DRFD01 / DRFD01-01 entry found in ' +
          (sheets.length ? sheets.length + ' sheet(s): ' + sheets.map(function(s){ return s.name; }).join(', ') : 'an empty workbook') });
      }
      res.evidence.forEach(function(e){ e.file = entry.path; state.evidence.push(e); });
    }).catch(function(err){
      state.skipped.push({ file: entry.path, reason: 'could not be read (' + (err && err.message ? err.message : err) + ')' });
    }).then(function(){ setTimeout(step, 0); });
  };
  step();
}

function finish(){
  state.rows = $('groupDates').checked ? P.groupByDate(state.perFile) : P.sortByDate(state.perFile);
  $('resultCard').style.display = '';
  renderStats(); renderTable(); renderEvidence(); renderSkipped();
  $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- rendering ---------- */

function money(n){
  if(n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function esc(s){ return String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, function(c){
  return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[c]; }); }

function totals(){
  return state.rows.reduce(function(a, r){
    a.o += r.ogdcl || 0; a.c += r.contractor || 0; return a;
  }, { o: 0, c: 0 });
}

function renderStats(){
  var t = totals();
  var noDate = state.rows.filter(function(r){ return !r.date; }).length;
  var cards = [
    ['Files scanned', state.files.length],
    ['Rows extracted', state.rows.length],
    ['DRFD01 — OGDCL', money(t.o)],
    ['DRFD01/01 — Contractor-01', money(t.c)],
    ['Grand total', money(t.o + t.c)]
  ];
  if(state.skipped.length) cards.push(['Skipped files', state.skipped.length]);
  if(noDate) cards.push(['Rows without a date', noDate]);
  $('stats').innerHTML = cards.map(function(c){
    return '<div class="stat"><div class="k">' + esc(c[0]) + '</div><div class="v">' + esc(c[1]) + '</div></div>';
  }).join('');
}

function renderTable(){
  if(!state.rows.length){
    $('tableWrap').innerHTML = '<div class="empty">Nothing matched. Try clearing the sheet-name filter, then check the evidence list below.</div>';
    return;
  }
  var t = totals();
  var head = '<tr><th>Date</th><th class="num">DRFD01 — OGDCL</th><th class="num">DRFD01/01 — Contractor-01</th><th class="num">Total</th><th>Source file</th><th>Sheet</th><th>Date from</th><th>Notes</th></tr>';
  var body = state.rows.map(function(r){
    var tot = (r.ogdcl || 0) + (r.contractor || 0);
    return '<tr>' +
      '<td>' + (r.date ? esc(r.date) : '<span class="tag warn">no date</span>') + '</td>' +
      '<td class="num">' + money(r.ogdcl) + '</td>' +
      '<td class="num">' + money(r.contractor) + '</td>' +
      '<td class="num">' + money(tot) + '</td>' +
      '<td>' + esc(r.file) + (r.fileCount > 1 ? ' <span class="tag">' + r.fileCount + ' files</span>' : '') + '</td>' +
      '<td>' + esc(r.sheet) + '</td>' +
      '<td>' + esc(r.dateSrc) + '</td>' +
      '<td class="note">' + esc(r.notes) + '</td></tr>';
  }).join('');
  var foot = '<tr><td>Grand total</td><td class="num">' + money(t.o) + '</td><td class="num">' + money(t.c) +
             '</td><td class="num">' + money(t.o + t.c) + '</td><td colspan="4"></td></tr>';
  $('tableWrap').innerHTML = '<table><thead>' + head + '</thead><tbody>' + body + '</tbody><tfoot>' + foot + '</tfoot></table>';
}

function renderEvidence(){
  if(!state.evidence.length){ $('evidenceBox').style.display = 'none'; return; }
  $('evidenceBox').style.display = '';
  var head = '<tr><th>File</th><th>Sheet</th><th>Code</th><th>Code cell</th><th>Matched text</th><th>Value cell</th><th class="num">Value</th><th>How</th></tr>';
  var body = state.evidence.map(function(e){
    return '<tr><td>' + esc(e.file) + '</td><td>' + esc(e.sheet) + '</td><td>' + esc(e.code) + '</td><td>' + esc(e.codeCell) +
      '</td><td class="note">' + esc(e.matchedText) + '</td><td>' + esc(e.valueCell) + '</td><td class="num">' +
      (e.value === '' ? '' : money(e.value)) + '</td><td>' + esc(e.method) + '</td></tr>';
  }).join('');
  $('evidenceWrap').innerHTML = '<table><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
}

function renderSkipped(){
  if(!state.skipped.length){ $('skippedBox').style.display = 'none'; return; }
  $('skippedBox').style.display = '';
  $('skippedWrap').innerHTML = '<ul class="plain">' + state.skipped.map(function(s){
    return '<li>' + esc(s.file) + ' — ' + esc(s.reason) + '</li>'; }).join('') + '</ul>';
}

/* ---------- export ---------- */

var HEAD = ['Date', 'DRFD01 — OGDCL Cost', 'DRFD01/01 — Contractor-01 (M/s Schlumberger SAECO Pakistan) Cost',
            'Total Cost', 'Source File(s)', 'Sheet', 'Date Source', 'Notes'];

function sheetRows(){
  var t = totals();
  var aoa = [HEAD];
  state.rows.forEach(function(r){
    aoa.push([ r.date || '', r.ogdcl === null ? '' : r.ogdcl, r.contractor === null ? '' : r.contractor,
               (r.ogdcl || 0) + (r.contractor || 0), r.file, r.sheet, r.dateSrc, r.notes ]);
  });
  aoa.push(['Grand Total', t.o, t.c, t.o + t.c, '', '', '', '']);
  return aoa;
}

function styleMoney(ws, cols, rowCount){
  cols.forEach(function(c){
    for(var r = 1; r <= rowCount; r++){
      var cell = ws[XLSX.utils.encode_cell({ r: r, c: c })];
      if(cell && cell.t === 'n') cell.z = '#,##0.00';
    }
  });
}

function exportXlsx(){
  var aoa = sheetRows();
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 34 }, { wch: 16 }, { wch: 46 }, { wch: 18 }, { wch: 22 }, { wch: 40 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  styleMoney(ws, [1, 2, 3], aoa.length - 1);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Date-wise Consumption');

  var ev = [['File', 'Sheet', 'Code', 'Code Cell', 'Matched Text', 'Value Cell', 'Value', 'How it was read']].concat(
    state.evidence.map(function(e){ return [e.file, e.sheet, e.code, e.codeCell, e.matchedText, e.valueCell, e.value, e.method]; }));
  var wsEv = XLSX.utils.aoa_to_sheet(ev);
  wsEv['!cols'] = [{ wch: 46 }, { wch: 18 }, { wch: 40 }, { wch: 10 }, { wch: 46 }, { wch: 10 }, { wch: 14 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsEv, 'Evidence');

  if(state.skipped.length){
    var sk = [['File', 'Why nothing was extracted']].concat(state.skipped.map(function(s){ return [s.file, s.reason]; }));
    var wsSk = XLSX.utils.aoa_to_sheet(sk);
    wsSk['!cols'] = [{ wch: 46 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsSk, 'Skipped Files');
  }
  XLSX.writeFile(wb, 'Consumption_DRFD01_vs_DRFD01-01.xlsx');
}

function exportCsv(){
  var aoa = sheetRows();
  var csv = aoa.map(function(row){
    return row.map(function(v){
      var s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',');
  }).join('\r\n');
  var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'Consumption_DRFD01_vs_DRFD01-01.csv';
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- wiring ---------- */

$('pickFiles').addEventListener('click', function(){ $('fInput').click(); });
$('pickFolder').addEventListener('click', function(){ $('dInput').click(); });
$('fInput').addEventListener('change', function(e){ addFiles(e.target.files); e.target.value = ''; });
$('dInput').addEventListener('change', function(e){ addFiles(e.target.files); e.target.value = ''; });
$('clear').addEventListener('click', function(){
  state = { files: [], rows: [], perFile: [], evidence: [], skipped: [] };
  refreshHint(); $('resultCard').style.display = 'none';
});
$('run').addEventListener('click', run);
$('download').addEventListener('click', exportXlsx);
$('downloadCsv').addEventListener('click', exportCsv);

var drop = $('drop');
drop.addEventListener('click', function(){ $('dInput').click(); });
['dragenter', 'dragover'].forEach(function(ev){
  drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.add('over'); });
});
['dragleave', 'drop'].forEach(function(ev){
  drop.addEventListener(ev, function(e){ e.preventDefault(); drop.classList.remove('over'); });
});
drop.addEventListener('drop', function(e){
  var items = e.dataTransfer.items, out = [], jobs = [];
  if(items && items.length && items[0].webkitGetAsEntry){
    for(var i = 0; i < items.length; i++){
      var entry = items[i].webkitGetAsEntry();
      if(entry) jobs.push(walkEntry(entry, '', out));
    }
    Promise.all(jobs).then(function(){
      if(!addFiles(out)) $('fileHint').textContent = 'Nothing usable in that drop — expected .xls/.xlsx/.csv report files.';
    });
  } else {
    addFiles(e.dataTransfer.files);
  }
});

refreshHint();
})();
