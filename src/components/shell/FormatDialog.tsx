import { Check, ChevronDown, Palette, Trash2, Upload } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PALETTES } from "@/lib/colorPalettes"
import { cn } from "@/lib/utils"
import {
  customFontFaceName,
  FONT_FAMILY_VALUES,
  useDisplayStore,
  type BorderStyle,
  type BorderWidth,
  type BuiltinFont,
  type CardScale,
  type ChartType,
  type FontSize,
  type IconWeight,
  type Radius,
  type Shadow,
} from "@/store/useDisplayStore"
import type { PaletteVars } from "@/lib/colorPalettes"

const SCALES: { key: CardScale; label: string }[] = [
  { key: "compact", label: "Compact" },
  { key: "comfortable", label: "Comfortable" },
  { key: "spacious", label: "Spacious" },
]

const RADII: { key: Radius; label: string }[] = [
  { key: "none", label: "None" },
  { key: "sm", label: "Small" },
  { key: "md", label: "Medium" },
  { key: "lg", label: "Large" },
]

const BORDER_WIDTHS: { key: BorderWidth; label: string }[] = [
  { key: "thin", label: "Thin" },
  { key: "medium", label: "Medium" },
  { key: "thick", label: "Thick" },
]

const BORDER_STYLES: { key: BorderStyle; label: string }[] = [
  { key: "solid", label: "Solid" },
  { key: "dashed", label: "Dashed" },
  { key: "dotted", label: "Dotted" },
]

const SHADOWS: { key: Shadow; label: string }[] = [
  { key: "flat", label: "Flat" },
  { key: "soft", label: "Soft" },
  { key: "elevated", label: "Elevated" },
]

const ICON_WEIGHTS: { key: IconWeight; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "regular", label: "Regular" },
  { key: "bold", label: "Bold" },
]

const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: "bar", label: "Bar" },
  { key: "line", label: "Line" },
  { key: "area", label: "Area" },
  { key: "pie", label: "Pie" },
  { key: "radar", label: "Radar" },
]

const FONT_FAMILIES: { key: BuiltinFont; label: string }[] = [
  { key: "inter", label: "Inter" },
  { key: "nunito", label: "Nunito" },
  { key: "roboto", label: "Roboto" },
  { key: "open-sans", label: "Open Sans" },
  { key: "montserrat", label: "Montserrat" },
  { key: "poppins", label: "Poppins" },
  { key: "system", label: "System UI" },
  { key: "serif", label: "Serif" },
  { key: "mono", label: "Monospace" },
]

const FONT_SIZES: { key: FontSize; label: string }[] = [
  { key: "sm", label: "Small" },
  { key: "md", label: "Medium" },
  { key: "lg", label: "Large" },
]

const COLOR_FIELDS: { key: keyof PaletteVars; label: string }[] = [
  { key: "primary", label: "Accent" },
  { key: "chart1", label: "Chart 1" },
  { key: "chart2", label: "Chart 2" },
  { key: "chart3", label: "Chart 3" },
  { key: "chart4", label: "Chart 4" },
  { key: "chart5", label: "Chart 5" },
]

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border bg-muted/50 p-1">
      {options.map((o) => (
        <Button
          key={o.key}
          type="button"
          size="sm"
          variant={value === o.key ? "default" : "ghost"}
          className="flex-1"
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      {children}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Global "Format" control: color, typography, shape, chart-type and table preferences, applied app-wide via useDisplayStore. */
export function FormatDialog() {
  const store = useDisplayStore()
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeCustomColors = store.customColors ?? PALETTES.find((p) => p.id === store.colorTheme)?.light ?? PALETTES[0].light

  async function handleFontFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const r = await store.uploadCustomFont(file)
    if (r.ok) toast.success(`"${file.name}" is now available as a font.`)
    else toast.error(r.error || "Could not load that font file.")
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="icon"
          className="size-9 rounded-full border-0 text-white shadow-sm transition-transform hover:scale-105 hover:shadow-md"
          style={{
            background:
              "conic-gradient(from 220deg, var(--chart-1), var(--chart-2), var(--chart-4), var(--chart-3), var(--chart-5), var(--chart-1))",
          }}
          title="Format dashboard"
        >
          <Palette className="size-4.5 drop-shadow-sm" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Format</DialogTitle>
          <DialogDescription>Customize colors, typography, shape, charts, and tables across the app.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="color">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="color">Color</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="shape">Shape</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
          </TabsList>

          <TabsContent value="color" className="grid gap-5 pt-4">
            <Section title="Color style">
              <div className="flex flex-wrap gap-2">
                {PALETTES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.label}
                    onClick={() => store.setColorTheme(p.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      store.colorTheme === p.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                    )}
                  >
                    <span className="flex size-4 items-center justify-center rounded-full" style={{ backgroundColor: p.swatch }}>
                      {store.colorTheme === p.id && <Check className="size-3 text-white" />}
                    </span>
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    store.colorTheme === "custom" ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                  )}
                >
                  Custom
                  <ChevronDown className={cn("size-3 transition-transform", advancedOpen && "rotate-180")} />
                </button>
              </div>
              {advancedOpen && (
                <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg border p-3">
                  {COLOR_FIELDS.map((f) => (
                    <label key={f.key} className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                      {f.label}
                      <input
                        type="color"
                        value={activeCustomColors[f.key]}
                        onChange={(e) => store.setCustomColor(f.key, e.target.value)}
                        className="h-8 w-full cursor-pointer rounded border bg-transparent p-0.5"
                      />
                    </label>
                  ))}
                </div>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="text" className="grid gap-5 pt-4">
            <Section title="Font family">
              <div className="grid gap-1.5">
                {FONT_FAMILIES.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => store.setFontFamily(f.key)}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      store.fontFamily === f.key ? "border-primary bg-primary/10" : "hover:bg-muted"
                    )}
                    style={{ fontFamily: FONT_FAMILY_VALUES[f.key] }}
                  >
                    {f.label}
                    {store.fontFamily === f.key && <Check className="size-4 text-primary" />}
                  </button>
                ))}
                {store.customFonts.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                      store.fontFamily === f.id ? "border-primary bg-primary/10" : "hover:bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => store.setFontFamily(f.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      style={{ fontFamily: `'${customFontFaceName(f.id)}', 'Inter Variable', sans-serif` }}
                    >
                      <span className="truncate">{f.fileName}</span>
                      {store.fontFamily === f.id && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => store.removeCustomFont(f.id)}
                      className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                      title="Remove this font"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Custom font file" hint="Upload a .ttf, .otf, .woff, or .woff2 file (max 2 MB) — including exported Microsoft Office fonts. Upload as many as you like; each is saved and stays selectable.">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload /> Upload font…
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                className="hidden"
                onChange={handleFontFileChange}
              />
            </Section>
            <Section title="Font size">
              <SegmentedControl options={FONT_SIZES} value={store.fontSize} onChange={store.setFontSize} />
            </Section>
          </TabsContent>

          <TabsContent value="shape" className="grid gap-5 pt-4">
            <Section title="Scale" hint="Size of KPI cards and chart height.">
              <SegmentedControl options={SCALES} value={store.cardScale} onChange={store.setCardScale} />
            </Section>
            <Section title="Corner radius">
              <SegmentedControl options={RADII} value={store.radius} onChange={store.setRadius} />
            </Section>
            <Section title="Borders">
              <div className="grid gap-2">
                <SegmentedControl options={BORDER_WIDTHS} value={store.borderWidth} onChange={store.setBorderWidth} />
                <SegmentedControl options={BORDER_STYLES} value={store.borderStyle} onChange={store.setBorderStyle} />
              </div>
            </Section>
            <Section title="Shadow">
              <SegmentedControl options={SHADOWS} value={store.shadow} onChange={store.setShadow} />
            </Section>
            <Section title="Icon weight">
              <SegmentedControl options={ICON_WEIGHTS} value={store.iconWeight} onChange={store.setIconWeight} />
            </Section>
          </TabsContent>

          <TabsContent value="charts" className="grid gap-5 pt-4">
            <Section title="Monthly Expenditure Trend" hint="Each chart can also be changed individually from its own card on the Dashboard.">
              <SegmentedControl options={CHART_TYPES} value={store.trendChartType} onChange={(t) => store.setChartType("trendChartType", t)} />
            </Section>
            <Section title="Expenditure by Service">
              <SegmentedControl options={CHART_TYPES} value={store.serviceChartType} onChange={(t) => store.setChartType("serviceChartType", t)} />
            </Section>
            <Section title="Invoice Value by Contractor">
              <SegmentedControl options={CHART_TYPES} value={store.vendorChartType} onChange={(t) => store.setChartType("vendorChartType", t)} />
            </Section>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="animations-toggle" className="text-sm font-medium">
                  Animations
                </Label>
                <p className="text-xs text-muted-foreground">Chart transitions and hover effects.</p>
              </div>
              <Switch id="animations-toggle" checked={store.animationsEnabled} onCheckedChange={store.setAnimationsEnabled} />
            </div>
          </TabsContent>

          <TabsContent value="table" className="grid gap-4 pt-4">
            <Section title="Table style" hint="Applies to the Invoices table.">
              <div className="grid gap-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="table-banded" className="text-sm font-normal">
                    Banded rows
                  </Label>
                  <Switch id="table-banded" checked={store.tableBanded} onCheckedChange={store.setTableBanded} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="table-header-shaded" className="text-sm font-normal">
                    Shaded header row
                  </Label>
                  <Switch id="table-header-shaded" checked={store.tableHeaderShaded} onCheckedChange={store.setTableHeaderShaded} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="table-grid-lines" className="text-sm font-normal">
                    Grid lines between columns
                  </Label>
                  <Switch id="table-grid-lines" checked={store.tableGridLines} onCheckedChange={store.setTableGridLines} />
                </div>
              </div>
            </Section>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
