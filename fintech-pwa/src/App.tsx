import { useEffect, useState } from "react"
import { LogOut } from "lucide-react"
import type { Contract, Invoice, View } from "./types"
import { useAuth } from "./lib/useAuth"
import { fetchContracts, fetchInvoices } from "./lib/data"
import { Login } from "./views/Login"
import { Dashboard } from "./views/Dashboard"
import { Invoices } from "./views/Invoices"
import { Contracts } from "./views/Contracts"
import { Reports } from "./views/Reports"
import { NavBar } from "./components/NavBar"

const VIEW_TITLES: Record<View, string> = {
  dashboard: "Dashboard",
  invoices: "Invoices",
  contracts: "Contracts",
  reports: "Reports",
}

export default function App() {
  const { status, signOut } = useAuth()
  const [view, setView] = useState<View>("dashboard")
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    setLoading(true)
    setError("")
    Promise.all([fetchInvoices(), fetchContracts()])
      .then(([inv, con]) => {
        if (cancelled) return
        setInvoices(inv)
        setContracts(con)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load data."))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [status])

  if (status === "loading") {
    return <div className="app-loading">Loading…</div>
  }

  if (status === "unauthenticated") {
    return <Login />
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">{VIEW_TITLES[view]}</div>
        <button className="icon-btn" onClick={signOut} title="Sign out">
          <LogOut size={18} />
        </button>
      </header>

      <main className="app-main">
        {loading && <div className="loading-banner">Loading data…</div>}
        {error && <div className="error-banner">{error}</div>}
        {!loading && !error && (
          <>
            {view === "dashboard" && <Dashboard invoices={invoices} />}
            {view === "invoices" && <Invoices invoices={invoices} />}
            {view === "contracts" && <Contracts contracts={contracts} />}
            {view === "reports" && <Reports invoices={invoices} contracts={contracts} />}
          </>
        )}
      </main>

      <NavBar view={view} onChange={setView} />
    </div>
  )
}
