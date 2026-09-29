import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { Invoice } from "../types"
import { fmtMoney, statusTone } from "../lib/data"

export function Invoices({ invoices }: { invoices: Invoice[] }) {
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return invoices
    return invoices.filter((i) => `${i.invoiceNo} ${i.vendor} ${i.wellName} ${i.service}`.toLowerCase().includes(query))
  }, [invoices, q])

  return (
    <div className="view-pad">
      <div className="search-bar">
        <Search size={16} />
        <input placeholder="Search invoice, vendor, well…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="list">
        {filtered.map((inv) => (
          <div className="list-row" key={inv.id}>
            <div className="list-row-main">
              <div className="list-row-title">{inv.invoiceNo || "Untitled invoice"}</div>
              <div className="list-row-sub">{inv.vendor}</div>
            </div>
            <div className="list-row-meta">
              <div className="list-row-amount">{fmtMoney(inv.amount)}</div>
              <span className={`badge badge-${statusTone(inv.status)}`}>{inv.status || "Unspecified"}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-state">No invoices match your search.</div>}
      </div>
    </div>
  )
}
