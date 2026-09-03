# Daily Reports — Consumption Cost Extractor

`consumption-extract.html` reads a folder of drilling-fluids daily reports (e.g.
`C:\Kal-04 Daily Reports`) and produces one date-wise Excel sheet with two cost
columns:

| Column | Meaning |
| --- | --- |
| `DRFD01 — OGDCL Cost` | cost booked against contract **DRFD01** (OGDCL) |
| `DRFD01/01 — Contractor-01 … Cost` | cost booked against **DRFD01/01** (Contractor-01, M/s Schlumberger SAECO Pakistan) |

## Using it

1. Download `tools/consumption-extract.html` and double-click it (Chrome or Edge).
2. Click **Choose folder…** and pick `C:\Kal-04 Daily Reports`, or drag the folder
   onto the page. Sub-folders are included.
3. Click **Extract costs**, then **Download Excel (.xlsx)**.

Everything runs inside the browser tab — SheetJS is embedded in the file, so the
reports never leave the machine and no internet connection is needed.

The exported workbook has three sheets:

* **Date-wise Consumption** — one row per date (or per file, if that option is
  unticked), both cost columns, the total, the source file, and where the date
  came from.
* **Evidence** — every matched code cell, the cell the cost was read from, and
  how it was read. Use this to spot-check a figure against the original report.
* **Skipped Files** — reports where no DRFD01 entry was found, with the reason.

## How the figures are found

* `DRFD01/01` is always read as the contractor line and is never double-counted
  as `DRFD01`. Variants such as `DRFD-01 / 01` match too. Other sub-contracts
  (`DRFD01/02`, `/03` …) are reported in the notes but excluded from both columns.
* Three sheet layouts are handled:
  * **code per row** — the value comes from the row's Cost/Amount column;
  * **codes as column headers** — the column's TOTAL row, else the column sum;
  * **code as a section heading** — that section's TOTAL row.
* Columns headed *cumulative*, *to date*, *quantity*, *rate* etc. are ignored so
  daily costs are not mixed with running totals.
* The report date is taken from the sheet's own Date cell, else the file name,
  else the folder name, else the file's modified date — and the source is shown
  for each row, so a wrong date is easy to spot.
* Dates like `03-04-2025` are read day-first by default; untick the option if a
  batch of reports is month-first.

If a report's layout is not picked up, open the **Evidence** sheet: it shows
whether the code cell was found at all and which cell the cost was taken from.

## Working on the tool

Sources live in `tools/src/` and the shipped file is built from them:

```
node tools/build.js                 # rebuild tools/consumption-extract.html
node tools/test/parser.test.js      # 28 layout / date / code-matching tests
node tools/test/make-fixtures.js d  # write sample daily reports into ./d
```

`build.js` inlines the SheetJS build that already ships inside `index.html`, so
the library exists in the repo only once. `src/parser.js` holds all the parsing
logic and has no DOM or SheetJS dependency, which is what the tests exercise.
