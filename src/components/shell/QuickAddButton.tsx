import { Plus } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

/** Persistent floating "+ New Invoice" affordance, reachable from any page — not just the
 *  Invoices page's own "New Entry" button — for the most common action in the app. Hidden
 *  on /invoices itself (redundant with that page's own button) and for roles that can't add. */
export function QuickAddButton() {
  const { can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!can("add")) return null
  if (location.pathname === "/invoices") return null

  return (
    <Button
      size="icon-lg"
      className="fixed right-6 bottom-6 z-40 size-12 rounded-full shadow-2xl"
      title="New invoice"
      onClick={() => navigate("/invoices", { state: { openAdd: true } })}
    >
      <Plus className="size-5" />
      <span className="sr-only">New invoice</span>
    </Button>
  )
}
