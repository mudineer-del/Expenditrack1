import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'

console.log('Launching browser')
const browser = await chromium.launch({ headless: true, timeout: 20000 })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
page.setDefaultTimeout(20000)
const errors = []
page.on('pageerror', e => errors.push(e.message))
const tables = {
  wells: [{ id: 'w1', name: 'Test Well', code: 'TW-1', status: 'Active' }],
  well_cost_departments: [{ id: 'd1', name: 'Drilling', sort_order: 1 }],
  well_cost_service_categories: [{ id: 's1', department_id: 'd1', name: 'Drilling Fluids', sort_order: 1 }],
  well_cost_centres: [
    { id: 'c1', well_id: 'w1', department_id: 'd1', service_category_id: 's1', currency: 'USD', planned_budget: 100 },
    { id: 'c2', well_id: 'w1', department_id: 'd1', service_category_id: 's1', currency: 'PKR', planned_budget: 1000 },
  ],
  well_cost_transactions: [
    { id: 't1', cost_centre_id: 'c1', entry_date: '2026-09-02', kind: 'actual', amount: 100 },
    { id: 't0', cost_centre_id: 'c1', entry_date: '2026-08-02', kind: 'actual', amount: 0 },
    { id: 't2', cost_centre_id: 'c2', entry_date: '2026-09-02', kind: 'actual', amount: 1200 },
  ],
  well_milestones: [{ id: 'm1', well_id: 'w1', label: 'Spud', planned_date: '2026-09-01', actual_date: null, sort_order: 0 }],
}
let savedLayout = null
await page.route('https://**/*', async route => {
  const url = new URL(route.request().url())
  if (url.pathname.includes('/rest/v1/')) {
    const table = url.pathname.split('/').pop()
    if (table === 'dashboard_layouts') {
      if (route.request().method() === 'POST') { savedLayout = route.request().postDataJSON(); await route.fulfill({ status: 201, body: '' }); return }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(savedLayout) }); return
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(tables[table] ?? []) }); return
  }
  await route.abort()
})
try {
  console.log('Loading local app')
  await page.goto('http://127.0.0.1:5173/login', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await page.waitForTimeout(1500)
  await page.evaluate(async () => {
    const { useAuthStore } = await import('/src/store/useAuthStore.ts')
    useAuthStore.setState({ status: 'authenticated', user: { id: 'test-user', name: 'Test User', email: 'test@example.invalid', role: 'Admin', status: 'active', areas: [], departments: [], initials: 'TU' } })
  })
  await page.locator('#main-content').waitFor()
  await page.evaluate(() => {
    history.pushState(null, '', '/well-cost')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  console.log('Checking overview')
  await page.getByRole('heading', { name: 'Well Cost Overview' }).waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'Test Well', exact: true }).waitFor()
  await page.evaluate(async () => {
    const { useDisplayStore, getSyncablePrefs } = await import('/src/store/useDisplayStore.ts')
    const older = getSyncablePrefs(useDisplayStore.getState())
    delete older.wellCostTrendChartType
    delete older.wellCostDeptChartType
    delete older.wellCostServiceChartType
    delete older.chartSlots.wellCostTrend
    useDisplayStore.getState().hydrateFromCloud(older)
    if (useDisplayStore.getState().wellCostTrendChartType !== 'bar') throw Error('Missing old-layout chart defaults')
  })
  await page.locator('.recharts-brush').waitFor()
  await page.getByRole('button', { name: 'View source cost entries' }).click()
  await page.getByRole('dialog').getByText('$100.00', { exact: true }).waitFor()
  await page.keyboard.press('Escape')
  assert.ok(await page.getByText('At budget', { exact: true }).count())
  await page.getByRole('combobox', { name: 'Cost currency' }).selectOption('PKR')
  await page.getByText('1 well needs budget review.').waitFor()
  await page.getByRole('tab', { name: 'Services', exact: true }).click()
  await page.getByRole('cell', { name: 'Over budget', exact: true }).waitFor()
  await page.getByRole('tab', { name: 'Drilling phases' }).click()
  await page.getByText(/Some phase boundaries use planned dates/).waitFor()
  await page.getByRole('tab', { name: 'Overview', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search wells' }).fill('no matching well')
  await page.getByText('No wells match your search.').waitFor()
  await page.getByRole('button', { name: 'Clear search' }).click()
  await page.getByRole('button', { name: 'Save Layout' }).click()
  await page.getByText('Saved to account', { exact: true }).waitFor()
  mkdirSync('.tmp/polish', { recursive: true })
  await page.waitForTimeout(5000)
  await page.screenshot({ path: '.tmp/polish/desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(500)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page must fit a mobile viewport')
  await page.screenshot({ path: '.tmp/polish/mobile.png', fullPage: true })
  await page.getByRole('tab', { name: 'Services', exact: true }).click()
  await page.screenshot({ path: '.tmp/polish/mobile-services.png', fullPage: true })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: '.tmp/polish/mobile-dark.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log('PASS: older layouts, trend brush, source entries, currency isolation, budget states, tabs, planned-date warning, search, layout save, mobile width, and no runtime errors.')
} catch (error) {
  console.log('Browser errors:', errors)
  console.log('Page:', (await page.locator('body').innerText()).slice(0, 2500))
  throw error
} finally { await browser.close() }
