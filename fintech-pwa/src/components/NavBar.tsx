import { FileText, LayoutDashboard, PieChart, ScrollText } from "lucide-react"
import type { View } from "../types"

const ITEMS: Array<{ view: View; label: string; icon: typeof LayoutDashboard }> = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "invoices", label: "Invoices", icon: FileText },
  { view: "contracts", label: "Contracts", icon: ScrollText },
  { view: "reports", label: "Reports", icon: PieChart },
]

export function NavBar({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <nav className="nav-bar">
      {ITEMS.map(({ view: v, label, icon: Icon }) => (
        <button key={v} className={"nav-item" + (v === view ? " nav-item-active" : "")} onClick={() => onChange(v)}>
          <Icon size={20} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
