# Polishing release

Changes build on the existing uncommitted Well Cost work.

1. **Well Cost completion:** older cloud layouts receive the new chart defaults;
   account hydration runs once per user, including accounts without a saved layout.
   Trend brush, value labels, chart size, and per-chart visibility are connected.
2. **Calculation checks:** `npm test` exercises DMR date precedence, OGDCL's
   repeated sub-header, duplicate/re-import handling, reconciliation, credits,
   rollups, and phase boundaries. Reconciliation uses the same first-report rule
   as the preview and does not infer gaps across mixed-well batches.
3. **Budget states:** at budget, over budget, within budget, no budget, and spend
   without budget are distinct. Portfolio views filter cost centres by currency;
   they never convert or add different currencies together.
4. **Dashboard organization:** Overview, Services, and Drilling Phases tabs keep
   detailed analysis separate from the headline totals and budget alerts.
5. **Presentation:** shared card headers wrap on narrow screens, mobile KPI
   labels wrap, legends use readable names, and source entries retain cents.
6. **Traceability:** source-entry dialog links to daily logs and supports month
   filtering and pagination. Planned phase boundaries are explicitly labelled.
7. **Workflow feedback:** well search includes clear/no-result states, failed
   data loads offer retry, and layout status distinguishes unsaved account changes.
8. **Accessibility:** skip link, one main landmark, keyboard-operable KPI actions
   and well links, named selectors, and scrollable comparison dialog.
9. **Release checks:** tests run before AWS uploads and in a separate pull-request
   workflow. Backup exporter includes milestones and dashboard layouts.

## Verification

- `npm test`
- `npm run build`
- `npm run lint` (existing warnings remain)
- Start `npm run dev -- --host 127.0.0.1 --port 5173`, then run
  `node scripts/smoke-polish.mjs`. Browser checks use synthetic data and intercept
  remote HTTP requests; no real account or data mutations are involved.
- Browser screenshots are saved under ignored `.tmp/polish/`.

## Existing production status checked September 15, 2026

- Configured site: https://d3mhv02mu3ov0m.cloudfront.net
- Latest AWS workflow: successful, September 14, commit `ca47f81`.
- `/well-cost` returns HTTP 200 HTML over HTTPS, with revalidation caching.
- Latest scheduled backup: successful, September 15.

The changes in this release have not been pushed or deployed. Custom-domain
aliases/certificate and actual sign-in redirects remain unverified; AWS CLI
credentials were unavailable. A real backup restoration rehearsal, complete
account/storage recovery, and an exhaustive audit of every theme and device
remain separate production checks. See `backup-setup.md` for recovery limits.
