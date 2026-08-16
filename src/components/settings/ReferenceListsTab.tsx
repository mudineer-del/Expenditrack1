import { ImagePlus, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ContractorLogo } from "@/components/shared/ContractorLogo"
import { getContractorLogo, useContractorLogos, type ContractorLogos } from "@/lib/contractorLogos"
import { vendorColor } from "@/lib/dashboard"
import { useReferenceLists, type ReferenceLists } from "@/lib/referenceLists"

const LISTS: { key: keyof ReferenceLists; title: string }[] = [
  { key: "departments", title: "Departments" },
  { key: "vendors", title: "Vendors / Contractors" },
  { key: "services", title: "Services" },
  { key: "types", title: "Types" },
  { key: "regions", title: "Regions" },
  { key: "statuses", title: "Statuses" },
]

function ListCard({
  title,
  items,
  onAdd,
  onRemove,
}: {
  title: string
  items: string[]
  onAdd: (v: string) => void
  onRemove: (v: string) => void
}) {
  const [value, setValue] = useState("")
  function submit() {
    if (!value.trim()) return
    onAdd(value)
    setValue("")
  }
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <div className="flex items-center gap-1.5">
          <Input
            className="h-8 w-40"
            value={value}
            placeholder="New value…"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
          />
          <Button size="sm" variant="outline" onClick={submit}>
            <Plus /> Add
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length ? (
          items.map((x) => (
            <span key={x} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {x}
              <button className="text-muted-foreground hover:text-destructive" title="Remove" onClick={() => onRemove(x)}>
                <X className="size-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No items yet.</span>
        )}
      </div>
    </div>
  )
}

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_LOGO_BYTES = 1024 * 1024

function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function ContractorLogoCard({
  vendor,
  logo,
  isSaving,
  onUpload,
  onRemove,
}: {
  vendor: string
  logo?: string
  isSaving: boolean
  onUpload: (file: File) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <ContractorLogo vendor={vendor} logo={logo} color={vendorColor(vendor)} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{vendor}</div>
        <div className="text-xs text-muted-foreground">{logo ? "Logo configured" : "Initials fallback"}</div>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:bg-muted has-disabled:pointer-events-none has-disabled:opacity-50">
        <ImagePlus className="size-3.5" />
        {logo ? "Replace" : "Add logo"}
        <input
          type="file"
          className="sr-only"
          accept="image/png,image/jpeg,image/webp,image/gif"
          disabled={isSaving}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            e.currentTarget.value = ""
          }}
        />
      </label>
      {logo && (
        <Button variant="ghost" size="icon" className="size-8 text-destructive" disabled={isSaving} title="Remove logo" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  )
}

/** Ported from the Reference Lists settings tab (index.html:5567-5589), now
 *  Supabase-synced (Phase 7) instead of local-storage-only. */
export function ReferenceListsTab() {
  const { ref, addValue, removeValue } = useReferenceLists()
  const { logos, setLogo, removeLogo, isSaving: logosSaving } = useContractorLogos()
  const [removeTarget, setRemoveTarget] = useState<{ key: keyof ReferenceLists; title: string; value: string } | null>(null)
  const [logoRemoveTarget, setLogoRemoveTarget] = useState<string | null>(null)

  async function handleLogoUpload(vendor: string, file: File) {
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error("Use a PNG, JPEG, WebP, or GIF image.")
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo files must be 1 MB or smaller.")
      return
    }
    try {
      await setLogo(vendor, await readLogo(file))
      toast.success(`${vendor} logo saved for the team.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the contractor logo.")
    }
  }

  async function confirmLogoRemove() {
    if (!logoRemoveTarget) return
    try {
      await removeLogo(logoRemoveTarget)
      toast.success(`${logoRemoveTarget} logo removed.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the contractor logo.")
    }
    setLogoRemoveTarget(null)
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
        Manage the dropdown options used across invoice entry, contracts and filters. Changes apply for every
        signed-in user immediately.
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="mb-1 text-sm font-semibold">Contractor logos</div>
        <p className="mb-3 text-xs text-muted-foreground">
          Add an optional PNG, JPEG, WebP, or GIF logo for each contractor. Logos are shared with the team and limited to 1 MB each;
          contractors without a logo keep the initials fallback.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ref.vendors.map((vendor) => (
            <ContractorLogoCard
              key={vendor}
              vendor={vendor}
              logo={getContractorLogo(logos as ContractorLogos, vendor)}
              isSaving={logosSaving}
              onUpload={(file) => void handleLogoUpload(vendor, file)}
              onRemove={() => setLogoRemoveTarget(vendor)}
            />
          ))}
        </div>
      </div>
      {LISTS.map((l) => (
        <ListCard
          key={l.key}
          title={l.title}
          items={ref[l.key]}
          onAdd={(v) => addValue(l.key, v)}
          onRemove={(v) => setRemoveTarget({ key: l.key, title: l.title, value: v })}
        />
      ))}

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this option?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget &&
                `"${removeTarget.value}" will no longer be offered under ${removeTarget.title}. Existing records that already use it keep it as-is.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) removeValue(removeTarget.key, removeTarget.value)
                setRemoveTarget(null)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!logoRemoveTarget} onOpenChange={(v) => !v && setLogoRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contractor logo?</AlertDialogTitle>
            <AlertDialogDescription>
              {logoRemoveTarget && `The shared logo for ${logoRemoveTarget} will be removed and the initials fallback will be used.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmLogoRemove()}>Remove logo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
