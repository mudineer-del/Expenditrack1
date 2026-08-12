import { Check, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { PALETTES } from "@/lib/colorPalettes"
import { cn } from "@/lib/utils"
import { useDisplayStore, type CardScale } from "@/store/useDisplayStore"

const SCALES: { key: CardScale; label: string }[] = [
  { key: "compact", label: "Compact" },
  { key: "comfortable", label: "Comfortable" },
  { key: "spacious", label: "Spacious" },
]

/** Global "Format" control: color style + KPI-card/chart scale, applied app-wide via useDisplayStore. */
export function FormatDialog() {
  const colorTheme = useDisplayStore((s) => s.colorTheme)
  const cardScale = useDisplayStore((s) => s.cardScale)
  const setColorTheme = useDisplayStore((s) => s.setColorTheme)
  const setCardScale = useDisplayStore((s) => s.setCardScale)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" title="Format dashboard">
          <Palette />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Format</DialogTitle>
          <DialogDescription>
            Customize the color style and sizing of KPI cards and charts across the app.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div>
            <div className="mb-2 text-sm font-medium">Color style</div>
            <div className="flex flex-wrap gap-2">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  onClick={() => setColorTheme(p.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    colorTheme === p.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  <span
                    className="flex size-4 items-center justify-center rounded-full"
                    style={{ backgroundColor: p.swatch }}
                  >
                    {colorTheme === p.id && <Check className="size-3 text-white" />}
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Scale</div>
            <div className="flex gap-1 rounded-lg border bg-muted/50 p-1">
              {SCALES.map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant={cardScale === s.key ? "default" : "ghost"}
                  className="flex-1"
                  onClick={() => setCardScale(s.key)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Controls the size of KPI cards and the height of charts on the Dashboard.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
