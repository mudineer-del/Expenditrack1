/* node tools/test/make-fixtures.js <dir>
   Writes four sample daily reports (three different consumption layouts plus a
   report with no consumption) so the extractor can be tried without real data.
   Uses the SheetJS build already bundled in index.html — no npm install. */
const fs=require('fs'), vm=require('vm'), path=require('path');
const app=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8');
const s=app.indexOf('<script>'), e=app.indexOf('</script>', s);
const ctx={console}; ctx.window=ctx; ctx.self=ctx; vm.createContext(ctx);
vm.runInContext(app.slice(s+8,e), ctx);
const X=ctx.XLSX;
const dir=process.argv[2] || path.join(__dirname,'fixtures'); fs.mkdirSync(dir,{recursive:true});
function save(name, sheets){
  const wb=X.utils.book_new();
  sheets.forEach(([n,rows])=>X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(rows), n));
  const b64=X.write(wb,{bookType: name.endsWith('.xls')?'xls':'xlsx', type:'base64'});
  fs.writeFileSync(path.join(dir,name), Buffer.from(b64,'base64'));
}
save('Kal-04 DDR 15-01-2025.xlsx', [
 ['Cover', [['OGDCL'],['Well: Kal-04']]],
 ['Consumption', [
  ['OGDCL — DRILLING FLUIDS DAILY REPORT'],
  ['Well:','Kal-04','','Date:','15-01-2025'],
  [],
  ['Sr','Contract No','Description','Qty','Rate','Cost (Today)','Cost (Cumulative)'],
  [1,'DRFD01','Barite 25 kg',10,100,1000,50000],
  [2,'DRFD01/01','Mud engineering services',1,2500,2500,90000]]]]);
save('Kal-04 DDR 16-01-2025.xlsx', [
 ['Chemical Consumption', [
  ['CHEMICAL CONSUMPTION SHEET'],
  ['Date:','16-Jan-2025'],
  [],
  ['Material','DRFD01 Cost','DRFD01/01 Cost'],
  ['Barite',500,0],
  ['Gel',300,200],
  ['TOTAL',800,200]]]]);
save('Kal-04 DDR 17-01-2025.xls', [
 ['Consumption', [
  ['CONSUMPTION — KAL-04'],
  ['Report Date','17/01/2025'],
  [],
  ['DRFD01 (OGDCL supplied material)'],
  ['Item','Qty','Amount'],
  ['Caustic Soda',5,700],
  ['Soda Ash',2,500],
  ['Total','',1200],
  [],
  ['DRFD01/01 (Contractor-01 M/s Schlumberger SAECO Pakistan)'],
  ['Item','Qty','Amount'],
  ['Polymer',4,3000],
  ['Lubricant',1,400],
  ['Total','',3400]]]]);
save('Kal-04 rig move note.xlsx', [['Sheet1',[['No consumption today']]]]);
console.log('fixtures in', dir);
