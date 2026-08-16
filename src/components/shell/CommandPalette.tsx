import { Building2, FileText, Receipt, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fmtMoney } from "@/lib/dashboard"
import { useReferenceLists } from "@/lib/referenceLists"
import { useAppStore } from "@/store/useAppStore"
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore"
import { useContractsQuery } from "@/hooks/useContracts"
import { useInvoicesQuery } from "@/hooks/useInvoices"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

const MAX_PER_GROUP = 6

/**
 * App-wide Ctrl/Cmd+K search across invoices, contracts, and vendors — jumps straight to
 * the matching record instead of navigating to a page and filtering by hand. Switches the
 * active department to the record's own department before navigating, so the deep-link
 * always resolves even if you're currently viewing a different (or "All") department —
 * otherwise the target could be silently filtered out of view on arrival.
 */
export function CommandPalette() {
  const navigate = useNavigate()
  const open = useCommandPaletteStore((s) => s.open)
  const setOpen = useCommandPaletteStore((s) => s.setOpen)
  const [query, setQuery] = useState("")
  const invoicesQuery = useInvoicesQuery()
  const contractsQuery = useContractsQuery()
  const { ref: refLists } = useReferenceLists()
  const setActiveDept = useAppStore((s) => s.setActiveDept)
  const setDashVendor = useAppStore((s) => s.setDashVendor)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        useCommandPaletteStore.getState().toggle()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return { invoices: [] as Invoice[], contracts: [] as Contract[], vendors: [] as string[] }

    const invoices = (invoicesQuery.data ?? [])
      .filter(
        (r) =>
          r.invoiceNo?.toLowerCase().includes(q) ||
          r.vendor?.toLowerCase().includes(q) ||
          r.wellName?.toLowerCase().includes(q) ||
          r.contractNo?.toLowerCase().includes(q)
      )
      .slice(0, MAX_PER_GROUP)

    const contracts = (contractsQuery.data ?? [])
      .filter((c) => c.contractNo?.toLowerCase().includes(q) || c.vendor?.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q))
      .slice(0, MAX_PER_GROUP)

    const vendors = refLists.vendors.filter((v) => v.toLowerCase().includes(q)).slice(0, MAX_PER_GROUP)

    return { invoices, contracts, vendors }
  }, [query, invoicesQuery.data, contractsQuery.data, refLists.vendors])

  function goInvoice(inv: Invoice) {
    setActiveDept(inv.department || "ALL")
    navigate("/invoices", { state: { openInvoiceId: inv.id } })
    setOpen(false)
  }
  function goContract(c: Contract) {
    setActiveDept(c.department || "ALL")
    navigate("/vendors", { state: { openContractId: c.id } })
    setOpen(false)
  }
  function goVendor(v: string) {
    setActiveDept("ALL")
    setDashVendor(v)
    navigate("/vendors")
    setOpen(false)
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return
    if (results.invoices.length) goInvoice(results.invoices[0])
    else if (results.contracts.length) goContract(results.contracts[0])
    else if (results.vendors.length) goVendor(results.vendors[0])
  }

  const hasResults = results.invoices.length > 0 || results.contracts.length > 0 || results.vendors.length > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">Search invoices, contracts, and vendors</DialogTitle>
        <div className="flex items-center gap-2 rounded-t-xl border-b px-3 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search invoices, contracts, vendors…"
            className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">Esc</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Type to search across invoices, contracts, and vendors.</p>
          ) : !hasResults ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No matches for "{query}".</p>
          ) : (
            <>
              {results.invoices.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Invoices</p>
                  {results.invoices.map((inv) => (
                    <button
                      key={inv.id}
                      type="button"
                      onClick={() => goInvoice(inv)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <Receipt className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {inv.invoiceNo || `#${inv.srNo}`} — {inv.vendor}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtMoney(inv.amountInclTax)}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.contracts.length > 0 && (
                <div className="mb-1">
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Contracts</p>
                  {results.contracts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => goContract(c)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{c.contractNo}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{c.vendor}</span>
                    </button>
                  ))}
                </div>
              )}
              {results.vendors.length > 0 && (
                <div>
                  <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Vendors</p>
                  {results.vendors.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => goVendor(v)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <Building2 className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{v}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
