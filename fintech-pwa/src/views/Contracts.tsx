import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { Contract } from "../types"
import { fmtMoney } from "../lib/data"

export function Contracts({ contracts }: { contracts: Contract[] }) {
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return contracts
    return contracts.filter((c) => `${c.contractNo} ${c.vendor} ${c.title}`.toLowerCase().includes(query))
  }, [contracts, q])

  return (
    <div className="view-pad">
      <div className="search-bar">
        <Search size={16} />
        <input placeholder="Search contract, vendor…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="list">
        {filtered.map((c) => (
          <div className="list-row" key={c.id}>
            <div className="list-row-main">
              <div className="list-row-title">{c.contractNo || "Untitled contract"}</div>
              <div className="list-row-sub">{c.vendor}{c.title ? ` — ${c.title}` : ""}</div>
            </div>
            <div className="list-row-meta">
              <div className="list-row-amount">{fmtMoney(c.value)}</div>
              <span className="badge badge-other">{c.status || "Unspecified"}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="empty-state">No contracts match your search.</div>}
      </div>
    </div>
  )
}
