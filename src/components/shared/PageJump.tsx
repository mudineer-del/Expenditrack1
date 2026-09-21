import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

/** "Go to page" box for a paginated list: type a page number and press Enter (or click
 *  away) to land on it directly instead of stepping with the arrows. Out-of-range or
 *  non-numeric entries snap to the nearest valid page / back to the current one. */
export function PageJump({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const [draft, setDraft] = useState(String(page))

  useEffect(() => {
    setDraft(String(page))
  }, [page])

  function commit() {
    const n = Math.round(Number(draft))
    if (!draft.trim() || Number.isNaN(n)) {
      setDraft(String(page))
      return
    }
    const next = Math.min(Math.max(n, 1), totalPages)
    setDraft(String(next))
    if (next !== page) onPageChange(next)
  }

  return (
    <span className="flex items-center gap-1.5 px-1">
      <Input
        type="number"
        min={1}
        max={totalPages}
        inputMode="numeric"
        aria-label="Go to page"
        title="Type a page number and press Enter"
        className="h-7 w-16 [appearance:textfield] px-2 text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commit()
          }
        }}
      />
      <span>/ {totalPages.toLocaleString()}</span>
    </span>
  )
}
