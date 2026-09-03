/* node tools/build.js — inlines SheetJS (taken from index.html, so there is only
   one copy of the library in the repo), parser.js and ui.js into the single
   self-contained file tools/consumption-extract.html. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// SheetJS lives in the first <script> block of the app.
const start = app.indexOf('<script>');
const end = app.indexOf('</script>', start);
const xlsx = app.slice(start + '<script>'.length, end).trim();
if(!/SheetJS/.test(xlsx) || !/aoa_to_sheet/.test(xlsx)){
  console.error('Could not find the bundled SheetJS build in index.html.');
  process.exit(1);
}

const shell = fs.readFileSync(path.join(__dirname, 'src', 'shell.html'), 'utf8');
const parser = fs.readFileSync(path.join(__dirname, 'src', 'parser.js'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, 'src', 'ui.js'), 'utf8');

const out = shell
  .replace('<!--INJECT:XLSX-->', () => xlsx)
  .replace('<!--INJECT:PARSER-->', () => parser)
  .replace('<!--INJECT:UI-->', () => ui);

if(out.includes('<!--INJECT:')){
  console.error('An injection marker was left unreplaced.');
  process.exit(1);
}

const dest = path.join(__dirname, 'consumption-extract.html');
fs.writeFileSync(dest, out);
console.log('built ' + path.relative(root, dest) + ' (' + (out.length / 1048576).toFixed(2) + ' MB)');
