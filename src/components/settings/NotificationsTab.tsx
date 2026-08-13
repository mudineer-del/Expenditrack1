import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/hooks/useAuth"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import {
  checkContractNotifications,
  loadNotifyConfig,
  loadNotifyPrefs,
  notifyConfigured,
  saveNotifyConfig,
  saveNotifyPrefs,
  sendNotificationEmail,
  type NotifyConfig,
  type NotifyPrefs,
} from "@/lib/notifications"

const PREF_ROWS: { key: keyof NotifyPrefs; label: string }[] = [
  { key: "newInvoice", label: "New invoice logged" },
  { key: "contractBudget", label: "Contract nearing budget limit / end date" },
  { key: "invoiceCleared", label: "Invoice cleared" },
  { key: "paymentReceived", label: "Payment received" },
  { key: "invoiceReturned", label: "Invoice returned" },
  { key: "weeklyDigest", label: "Weekly expenditure digest" },
]

/** Ported from the Notifications settings tab (index.html:5315-5366). All 6
 *  triggers are wired up now (Phase 7) — the legacy app only had the first
 *  2 actually sending email and left the rest as inert toggles. */
export function NotificationsTab() {
  const { isAdmin } = useAuth()
  const invoicesQuery = useInvoicesQuery()
  const contractsQuery = useContractsQuery()
  const [prefs, setPrefs] = useState<NotifyPrefs>(loadNotifyPrefs)
  const [cfg, setCfg] = useState<NotifyConfig>(loadNotifyConfig)
  const [busy, setBusy] = useState(false)

  function togglePref(key: keyof NotifyPrefs, checked: boolean) {
    const next = { ...prefs, [key]: checked }
    setPrefs(next)
    saveNotifyPrefs(next)
    toast.success("Preference saved.")
  }

  function saveConfig() {
    if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId || !cfg.toEmail) {
      toast.error("Fill in all four fields.")
      return
    }
    saveNotifyConfig(cfg)
    toast.success("Email configuration saved.")
  }

  async function sendTest() {
    if (!notifyConfigured(cfg)) {
      toast.error("Fill in all four fields first.")
      return
    }
    setBusy(true)
    toast.message("Sending test email…")
    const r = await sendNotificationEmail(cfg, "Test notification — OGDCL Expenditure Tracker", "This is a test email to confirm notification delivery is working.")
    setBusy(false)
    if (r.ok) toast.success("Test email sent — check the inbox.")
    else toast.error(`Failed: ${r.error}`)
  }

  async function checkNow() {
    if (!notifyConfigured(cfg)) {
      toast.error("Save the email configuration first.")
      return
    }
    setBusy(true)
    toast.message("Checking contracts…")
    const r = await checkContractNotifications(cfg, prefs, contractsQuery.data ?? [], invoicesQuery.data ?? [])
    setBusy(false)
    toast.success(r.sent ? `Sent ${r.sent} contract alert${r.sent !== 1 ? "s" : ""}.` : "No new alerts — nothing crossed a threshold (or already notified within 7 days).")
  }

  const configured = notifyConfigured(cfg)

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold">Notification Preferences</h3>
        <div className="divide-y">
          {PREF_ROWS.map((p) => (
            <div key={p.key} className="flex items-center justify-between py-3">
              <span className="font-medium">{p.label}</span>
              <Switch checked={prefs[p.key]} onCheckedChange={(v) => togglePref(p.key, v)} />
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Delivery requires the EmailJS connection below to be configured{isAdmin ? "" : " by an admin"}.
        </p>
      </div>

      {isAdmin && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Email delivery (EmailJS)</h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${configured ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" : "bg-muted text-muted-foreground"}`}
            >
              {configured ? "Connected" : "Not configured"}
            </span>
          </div>
          <p className="mb-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Create a free account at emailjs.com, add an Email Service and a Template containing the variables{" "}
            <code>to_email</code>, <code>subject</code> and <code>message</code>, then paste the three IDs below
            along with the address that should receive alerts.
          </p>
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            This configuration is saved to this browser only, not shared across your team. Automatic contract and
            weekly-digest checks only run while someone opens the Dashboard in a browser where it's set up — "Check
            contracts now" below is the reliable way to trigger a check on demand.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Public Key</Label>
              <Input value={cfg.publicKey} onChange={(e) => setCfg({ ...cfg, publicKey: e.target.value })} placeholder="e.g. AbCdEfGhIjKlMnOp" />
            </div>
            <div className="grid gap-1.5">
              <Label>Service ID</Label>
              <Input value={cfg.serviceId} onChange={(e) => setCfg({ ...cfg, serviceId: e.target.value })} placeholder="service_xxxxxxx" />
            </div>
            <div className="grid gap-1.5">
              <Label>Template ID</Label>
              <Input value={cfg.templateId} onChange={(e) => setCfg({ ...cfg, templateId: e.target.value })} placeholder="template_xxxxxxx" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Notify this address</Label>
              <Input type="email" value={cfg.toEmail} onChange={(e) => setCfg({ ...cfg, toEmail: e.target.value })} placeholder="you@ogdcl.com.pk" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={saveConfig}>Save configuration</Button>
            <Button variant="outline" disabled={busy} onClick={sendTest}>
              Send test email
            </Button>
            <Button variant="outline" disabled={busy} onClick={checkNow}>
              Check contracts now
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
