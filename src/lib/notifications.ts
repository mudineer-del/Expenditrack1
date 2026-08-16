import { storeGet, storeSet } from "@/lib/localCache"
import { fmtMoney } from "@/lib/dashboard"
import { contractExpenditure } from "@/lib/contracts"
import { shortContract } from "@/lib/reports"
import { errorMessage } from "@/lib/utils"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

/**
 * Email notifications (EmailJS) — optional. Ported from index.html:1310-1413.
 * Uses EmailJS's plain REST endpoint via fetch, so no extra SDK needs
 * loading. If not configured, every trigger below is a silent no-op —
 * nothing else in the app depends on this.
 */
export interface NotifyConfig {
  publicKey: string
  serviceId: string
  templateId: string
  toEmail: string
}

export interface NotifyPrefs {
  newInvoice: boolean
  contractBudget: boolean
  invoiceCleared: boolean
  paymentReceived: boolean
  invoiceReturned: boolean
  weeklyDigest: boolean
}

const NOTIFY_ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send"
const CONFIG_KEY = "notifyConfig"
const PREFS_KEY = "notifyPrefs"
const NOTIFIED_CONTRACTS_KEY = "notifiedContracts"
const LAST_DIGEST_KEY = "notifyLastDigestAt"

/** All 6 triggers default to on, unlike the legacy app (which only had the
 *  first 2 actually wired up and left the rest as inert toggles). */
export const DEFAULT_NOTIFY_PREFS: NotifyPrefs = {
  newInvoice: true,
  contractBudget: true,
  invoiceCleared: true,
  paymentReceived: true,
  invoiceReturned: true,
  weeklyDigest: true,
}

const BLANK_CONFIG: NotifyConfig = { publicKey: "", serviceId: "", templateId: "", toEmail: "" }

export function loadNotifyConfig(): NotifyConfig {
  return { ...BLANK_CONFIG, ...(storeGet<Partial<NotifyConfig>>(CONFIG_KEY) || {}) }
}
export function saveNotifyConfig(cfg: NotifyConfig): void {
  storeSet(CONFIG_KEY, cfg)
}
export function loadNotifyPrefs(): NotifyPrefs {
  return { ...DEFAULT_NOTIFY_PREFS, ...(storeGet<Partial<NotifyPrefs>>(PREFS_KEY) || {}) }
}
export function saveNotifyPrefs(prefs: NotifyPrefs): void {
  storeSet(PREFS_KEY, prefs)
}

export function notifyConfigured(cfg: NotifyConfig): boolean {
  return !!(cfg.publicKey && cfg.serviceId && cfg.templateId && cfg.toEmail)
}

/** Low-level send. Never throws — failures are reported, not fatal. Ported from sendNotificationEmail (index.html:1338-1359). */
export async function sendNotificationEmail(
  cfg: NotifyConfig,
  subject: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  if (!notifyConfigured(cfg)) return { ok: false, error: "Email notifications are not configured yet." }
  try {
    const res = await fetch(NOTIFY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: cfg.serviceId,
        template_id: cfg.templateId,
        user_id: cfg.publicKey,
        template_params: { to_email: cfg.toEmail, subject, message },
      }),
    })
    if (res.ok) return { ok: true }
    const text = await res.text().catch(() => "")
    return { ok: false, error: `HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}` }
  } catch (e) {
    return { ok: false, error: errorMessage(e) }
  }
}

/** Trigger 1 (live in the legacy app too): a brand-new invoice was logged. Ported from notifyNewInvoice (index.html:1362-1375). */
export async function notifyNewInvoice(cfg: NotifyConfig, prefs: NotifyPrefs, record: Invoice) {
  if (!prefs.newInvoice) return
  const subject = `New invoice logged: ${record.invoiceNo || `#${record.srNo}`}`
  const message = [
    "A new invoice has been logged in the OGDCL Drilling Fluids Expenditure Tracker.",
    "",
    `Invoice No: ${record.invoiceNo || "—"}`,
    `Vendor: ${record.vendor || "—"}`,
    `Well: ${record.wellName || "—"}`,
    `Amount (incl. tax): ${fmtMoney(record.amountInclTax)}`,
    `Status: ${record.status || "—"}`,
    `Invoice Date: ${record.invoiceDate || "—"}`,
  ].join("\n")
  await sendNotificationEmail(cfg, subject, message)
}

/** Trigger 3 (new): invoice status transitioned into "Cleared". */
export async function notifyInvoiceCleared(cfg: NotifyConfig, prefs: NotifyPrefs, record: Invoice) {
  if (!prefs.invoiceCleared) return
  const subject = `Invoice cleared: ${record.invoiceNo || `#${record.srNo}`}`
  const message = [
    `Invoice ${record.invoiceNo || `#${record.srNo}`} has been marked Cleared.`,
    "",
    `Vendor: ${record.vendor || "—"}`,
    `Amount (incl. tax): ${fmtMoney(record.amountInclTax)}`,
    `Clearance Date: ${record.clearanceDate || "—"}`,
  ].join("\n")
  await sendNotificationEmail(cfg, subject, message)
}

/** Trigger 4 (new): amount paid went from 0/blank to a positive value. */
export async function notifyPaymentReceived(cfg: NotifyConfig, prefs: NotifyPrefs, record: Invoice) {
  if (!prefs.paymentReceived) return
  const subject = `Payment received: ${record.invoiceNo || `#${record.srNo}`}`
  const message = [
    `A payment has been recorded for invoice ${record.invoiceNo || `#${record.srNo}`}.`,
    "",
    `Vendor: ${record.vendor || "—"}`,
    `Amount Paid: ${fmtMoney(record.amountPaid)}`,
    `Amount (incl. tax): ${fmtMoney(record.amountInclTax)}`,
  ].join("\n")
  await sendNotificationEmail(cfg, subject, message)
}

/** Trigger 5 (new): invoice status transitioned into "Returned". */
export async function notifyInvoiceReturned(cfg: NotifyConfig, prefs: NotifyPrefs, record: Invoice) {
  if (!prefs.invoiceReturned) return
  const subject = `Invoice returned: ${record.invoiceNo || `#${record.srNo}`}`
  const message = [
    `Invoice ${record.invoiceNo || `#${record.srNo}`} has been marked Returned and needs attention.`,
    "",
    `Vendor: ${record.vendor || "—"}`,
    `Status: ${record.status || "—"}`,
  ].join("\n")
  await sendNotificationEmail(cfg, subject, message)
}

/**
 * Trigger 2 (live in the legacy app too): a contract is nearing/over budget,
 * or nearing/past its end date. Re-checks every contract, but won't re-send
 * the same alert for the same contract within 7 days. Ported from
 * checkContractNotifications (index.html:1380-1413).
 */
export async function checkContractNotifications(
  cfg: NotifyConfig,
  prefs: NotifyPrefs,
  contracts: Contract[],
  invoices: Invoice[]
): Promise<{ sent: number }> {
  if (!prefs.contractBudget || !notifyConfigured(cfg)) return { sent: 0 }
  const today = new Date()
  const flags = storeGet<Record<string, string>>(NOTIFIED_CONTRACTS_KEY) || {}
  const labelMap: Record<string, string> = {
    over_budget: "is over budget",
    near_budget: "is nearing its budget limit",
    expired: "is past its end date",
    near_expiry: "is nearing its end date",
  }
  let changed = false
  let sent = 0
  for (const c of contracts) {
    const spent = contractExpenditure(invoices, c.contractNo)
    const cost = Number(c.value) || 0
    const util = cost > 0 ? (spent / cost) * 100 : null
    const end = c.endDate ? new Date(c.endDate) : null
    const daysLeft = end && !isNaN(end.getTime()) ? Math.round((end.getTime() - today.getTime()) / 86400000) : null
    const reasons: string[] = []
    if (util !== null) {
      if (util >= 100) reasons.push("over_budget")
      else if (util >= 90) reasons.push("near_budget")
    }
    if (daysLeft !== null) {
      if (daysLeft < 0) reasons.push("expired")
      else if (daysLeft <= 30) reasons.push("near_expiry")
    }
    for (const reason of reasons) {
      const key = `${c.id}::${reason}`
      const last = flags[key]
      const daysSinceLast = last ? (today.getTime() - new Date(last).getTime()) / 86400000 : Infinity
      if (daysSinceLast < 7) continue
      const subject = `Contract alert: ${shortContract(c.contractNo)} ${labelMap[reason]}`
      const message = [
        `Contract: ${c.contractNo}`,
        `Vendor: ${c.vendor || "—"}`,
        util !== null ? `Utilization: ${util.toFixed(1)}% (${fmtMoney(spent)} of ${fmtMoney(cost)})` : "",
        daysLeft !== null ? `Days remaining: ${daysLeft}` : "",
        "",
        "Review this contract in the Vendors & Contracts tab.",
      ]
        .filter(Boolean)
        .join("\n")
      const r = await sendNotificationEmail(cfg, subject, message)
      if (r.ok) {
        flags[key] = today.toISOString()
        changed = true
        sent++
      }
    }
  }
  if (changed) storeSet(NOTIFIED_CONTRACTS_KEY, flags)
  return { sent }
}

/**
 * Trigger 6 (new): weekly expenditure digest. There is no server-side cron
 * in a front-end-only app, so this is a best-effort check-on-app-load: if
 * more than 7 days have passed since the last digest, compile a summary of
 * the past week and send it, then record the timestamp.
 */
export async function maybeSendWeeklyDigest(
  cfg: NotifyConfig,
  prefs: NotifyPrefs,
  invoices: Invoice[]
): Promise<{ sent: boolean }> {
  if (!prefs.weeklyDigest || !notifyConfigured(cfg)) return { sent: false }
  const last = storeGet<string>(LAST_DIGEST_KEY)
  const daysSince = last ? (Date.now() - new Date(last).getTime()) / 86400000 : Infinity
  if (daysSince < 7) return { sent: false }

  const weekAgoTs = Date.now() - 7 * 86400000
  const recent = invoices.filter((r) => r.invoiceDate && new Date(r.invoiceDate).getTime() >= weekAgoTs)
  const total = recent.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
  const cleared = recent.filter((r) => (r.status || "").toLowerCase().includes("cleared")).length
  const subject = `Weekly expenditure digest — ${recent.length} invoice${recent.length !== 1 ? "s" : ""} this week`
  const message = [
    `Summary of activity in the OGDCL Drilling Fluids Expenditure Tracker over the last 7 days:`,
    "",
    `Invoices logged: ${recent.length}`,
    `Total value (incl. tax): ${fmtMoney(total)}`,
    `Cleared: ${cleared}`,
  ].join("\n")
  const r = await sendNotificationEmail(cfg, subject, message)
  if (r.ok) storeSet(LAST_DIGEST_KEY, new Date().toISOString())
  return { sent: r.ok }
}
