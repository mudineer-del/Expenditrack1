import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic"
import { Upload } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ICONS_3D } from "@/lib/iconLibrary3d"
import { getCustomIcons, saveCustomIcon } from "@/lib/customIcons"
import { cn } from "@/lib/utils"
import type { IconRef } from "@/store/useSidebarPrefsStore"

// Full lucide set is ~1500 icons — mounting every one of those as a DynamicIcon at
// once would fire that many concurrent lazy-chunk loads. With no search term, show a
// capped alphabetical slice instead and let the search box reach the rest, which keeps
// the grid responsive without needing a curated "popular" subset to maintain.
const DEFAULT_2D_LIMIT = 150
const SEARCH_RESULT_LIMIT = 300

export function IconPickerDialog({
  open,
  onOpenChange,
  label,
  value,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  value: IconRef | null
  onPick: (ref: IconRef | null) => void
}) {
  const [tab, setTab] = useState<"2d" | "3d">(value?.kind === "3d" ? "3d" : "2d")
  const [search, setSearch] = useState("")
  const [customIcons, setCustomIcons] = useState(() => getCustomIcons())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImportIcon = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload PNG, JPEG, GIF, WebP, or SVG format only")
      return
    }

    // Validate file size (max 500KB)
    const maxSize = 500 * 1024
    if (file.size > maxSize) {
      toast.error("File size must be less than 500KB")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const id = `custom-${Date.now()}`
      const label = file.name.replace(/\.[^/.]+$/, "") // Remove extension

      const newIcon = { id, src, label }
      saveCustomIcon(newIcon)
      setCustomIcons((prev) => [...prev, newIcon])
      toast.success(`"${label}" imported successfully`)
    }
    reader.readAsDataURL(file)

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const allIcons3d = useMemo(() => [...ICONS_3D, ...customIcons], [customIcons])

  const filtered2d = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return iconNames.slice(0, DEFAULT_2D_LIMIT)
    return iconNames.filter((n) => n.includes(q)).slice(0, SEARCH_RESULT_LIMIT)
  }, [search])

  const filtered3d = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allIcons3d
    return allIcons3d.filter((i) => i.label.toLowerCase().includes(q) || i.id.includes(q))
  }, [search, allIcons3d])

  function pick(ref: IconRef) {
    onPick(ref)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose an icon</DialogTitle>
          <DialogDescription>Pick a replacement icon for "{label}", or use the default.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "2d" | "3d")}>
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="2d">Icons</TabsTrigger>
              <TabsTrigger value="3d">3D icons</TabsTrigger>
            </TabsList>
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 flex-1"
            />
          </div>

          <TabsContent value="2d" className="mt-3">
            <div className="grid max-h-72 grid-cols-6 gap-1 overflow-y-auto pr-1 sm:grid-cols-8">
              {filtered2d.map((name) => (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={() => pick({ kind: "lucide", name })}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary",
                    value?.kind === "lucide" && value.name === name && "border-primary bg-primary/10 text-primary"
                  )}
                >
                  <DynamicIcon name={name as IconName} className="size-4" />
                </button>
              ))}
            </div>
            {!search && (
              <p className="mt-2 text-xs text-muted-foreground">
                Showing the first {DEFAULT_2D_LIMIT} icons — search to find more of the full library.
              </p>
            )}
            {search && filtered2d.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No icons match "{search}".</p>}
          </TabsContent>

          <TabsContent value="3d" className="mt-3">
            <div className="mb-3 flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={handleImportIcon}
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="size-4" />
                Import 3D icon
              </Button>
              {customIcons.length > 0 && (
                <span className="text-xs text-muted-foreground">{customIcons.length} custom icon{customIcons.length !== 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="grid max-h-72 grid-cols-5 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-6">
              {filtered3d.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  title={icon.label}
                  onClick={() => pick({ kind: "3d", id: icon.id })}
                  className={cn(
                    "flex min-h-20 flex-col items-center gap-1.5 rounded-md border p-2 transition-colors hover:border-primary hover:bg-primary/10",
                    value?.kind === "3d" && value.id === icon.id && "border-primary bg-primary/10"
                  )}
                >
                  <img src={icon.src} alt="" className="size-11 object-contain" />
                  <span className="w-full truncate text-center text-[9px] text-muted-foreground">{icon.label}</span>
                </button>
              ))}
            </div>
            {filtered3d.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No icons match "{search}".</p>}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onPick(null)
              onOpenChange(false)
            }}
          >
            Use default icon
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
