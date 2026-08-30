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
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { accentBackgroundStyle } from "@/components/dashboard/ChartCard"
import { PALETTES } from "@/lib/colorPalettes"
import { CHART_MEASURES, chartMeasureLabel, GROUP_BY_OPTIONS, reportGroupLabel, type ChartMeasure } from "@/lib/reports"
import { cn } from "@/lib/utils"
import {
  customFontFaceName,
  FONT_FAMILY_VALUES,
  useDisplayStore,
  type BorderStyle,
  type BorderWidth,
  type BuiltinFont,
  type CardScale,
  type ChartBackground,
  type ChartBackgroundDirection,
  type ChartDimension,
  type ChartLabelPosition,
  type ChartSlotId,
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

const CHART_BG_LEVELS: { key: ChartBackground; label: string }[] = [
  { key: "flat", label: "Flat" },
  { key: "subtle", label: "Subtle" },
  { key: "gradient", label: "Gradient" },
]
const CHART_BG_DIRECTIONS: { key: ChartBackgroundDirection; label: string }[] = [
  { key: "diagonal", label: "Diagonal" },
  { key: "vertical", label: "Down" },
  { key: "horizontal", label: "Across" },
  { key: "radial", label: "Radial" },
]
/** Stand-in accent for the Settings preview swatches — every real chart card has its own
 *  (dataviz-1, dataviz-2, ...), but the picker just needs one representative color. */
const CHART_BG_PREVIEW_ACCENT = "var(--primary)"

/** Office-style small-thumbnail fill picker: a swatch grid for the background *level*
 *  (flat/subtle/gradient), plus a second grid for gradient *direction* once a level with
 *  an actual gradient is picked — each thumbnail is rendered with the real
 *  accentBackgroundStyle() a chart card would get, so the preview is exact, not a mockup. */
function ChartBackgroundPicker({
  level,
  direction,
  onLevelChange,
  onDirectionChange,
}: {
  level: ChartBackground
  direction: ChartBackgroundDirection
  onLevelChange: (v: ChartBackground) => void
  onDirectionChange: (v: ChartBackgroundDirection) => void
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        {CHART_BG_LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => onLevelChange(l.key)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border-2 p-1.5 transition-colors",
              level === l.key ? "border-primary" : "border-transparent hover:border-border"
            )}
          >
            <span
              className="h-10 w-full rounded-md border"
              style={accentBackgroundStyle(CHART_BG_PREVIEW_ACCENT, l.key, direction)}
            />
            <span className="text-[11px] font-medium text-muted-foreground">{l.label}</span>
          </button>
        ))}
      </div>
      {level !== "flat" && (
        <div className="grid grid-cols-4 gap-2">
          {CHART_BG_DIRECTIONS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => onDirectionChange(d.key)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border-2 p-1.5 transition-colors",
                direction === d.key ? "border-primary" : "border-transparent hover:border-border"
              )}
            >
              <span
                className="h-8 w-full rounded-md border"
                style={accentBackgroundStyle(CHART_BG_PREVIEW_ACCENT, "gradient", d.key)}
              />
              <span className="text-[10.5px] font-medium text-muted-foreground">{d.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

interface ChartSlotMeta {
  id: ChartSlotId
  title: string
  hasDimension: boolean
  /** Only the three trend-chart slots have a Brush/zoom control to toggle. */
  hasZoom?: boolean
}

const DASHBOARD_SLOTS: ChartSlotMeta[] = [
  { id: "dashTrend", title: "Monthly Expenditure Trend", hasDimension: true, hasZoom: true },
  { id: "dashService", title: "Expenditure by Service", hasDimension: true },
  { id: "dashVendor", title: "Invoice Value by Contractor", hasDimension: true },
  { id: "dashBreakdown", title: "Contractor / Type Breakdown", hasDimension: true },
  { id: "dashStatus", title: "Expenditure by Status", hasDimension: true },
]
const DETAIL_SHEET_SLOTS: ChartSlotMeta[] = [
  { id: "vendorSheetTrend", title: "Vendor sheet — Spending Trend", hasDimension: true, hasZoom: true },
  { id: "vendorSheetService", title: "Vendor sheet — Expenditure by Service", hasDimension: true },
  { id: "contractSheetTrend", title: "Contract sheet — Spending Trend", hasDimension: true, hasZoom: true },
  { id: "contractSheetService", title: "Contract sheet — Expenditure by Service", hasDimension: true },
]
const REPORTS_SLOTS: ChartSlotMeta[] = [
  { id: "periodValue", title: "Period Report — Expenditure chart", hasDimension: false },
  { id: "compareTa", title: "Compare Contracts — Avg Turnaround chart", hasDimension: false },
  { id: "contractBuckets", title: "Contract Report — Turnaround Buckets chart", hasDimension: false },
  { id: "contractMonthly", title: "Contract Report — Monthly Expenditure chart", hasDimension: false },
]

const AUTO_DIMENSION = "__auto__"

/** One configurable chart's Dimension + Measure controls — reads/writes `chartSlots[id]` directly
 *  off the store so each row only re-renders when its own slot changes. `dashBreakdown` is the one
 *  slot whose dimension defaults to "unset" (an automatic Contractor/Type swap driven by the
 *  Dashboard's contractor filter) — its picker gets an extra "Automatic" option for that state. */
function ChartSlotRow({ id, title, hasDimension, hasZoom }: ChartSlotMeta) {
  const cfg = useDisplayStore((s) => s.chartSlots[id])
  const setChartSlot = useDisplayStore((s) => s.setChartSlot)
  const canBeAuto = id === "dashBreakdown"

  return (
    <div className="rounded-lg border p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-xs font-medium">
          {title}
          {cfg.hidden && <span className="ml-1.5 text-muted-foreground">(hidden)</span>}
        </div>
        <Switch
          className="shrink-0"
          checked={!cfg.hidden}
          onCheckedChange={(checked) => setChartSlot(id, { hidden: !checked })}
          title={cfg.hidden ? "Show this chart" : "Hide this chart"}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {hasDimension && (
          <Select
            value={cfg.dimension ?? AUTO_DIMENSION}
            onValueChange={(v) => setChartSlot(id, { dimension: v === AUTO_DIMENSION ? undefined : (v as ChartDimension) })}
          >
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {canBeAuto && <SelectItem value={AUTO_DIMENSION}>Automatic</SelectItem>}
              {GROUP_BY_OPTIONS.map((g) => (
                <SelectItem key={g} value={g}>
                  {reportGroupLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={cfg.measure} onValueChange={(v) => setChartSlot(id, { measure: v as ChartMeasure })}>
          <SelectTrigger className="h-8 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_MEASURES.map((m) => (
              <SelectItem key={m} value={m}>
                {chartMeasureLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasZoom && (
        <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
          <Label htmlFor={`${id}-zoom`} className="text-xs font-normal text-muted-foreground">
            Zoom bar
          </Label>
          <Switch
            id={`${id}-zoom`}
            className="shrink-0"
            checked={cfg.zoomEnabled ?? true}
            onCheckedChange={(checked) => setChartSlot(id, { zoomEnabled: checked })}
            title={cfg.zoomEnabled === false ? "Show the zoom/pan bar" : "Hide the zoom/pan bar"}
          />
        </div>
      )}
    </div>
  )
}

const LABEL_POSITIONS: { key: ChartLabelPosition; label: string }[] = [
  { key: "outside", label: "Outside" },
  { key: "inside", label: "Inside" },
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
  const activeCustomFont = store.customFonts.find((f) => f.id === store.fontFamily)
  const activeFontCss =
    store.fontFamily in FONT_FAMILY_VALUES
      ? FONT_FAMILY_VALUES[store.fontFamily as BuiltinFont]
      : activeCustomFont
        ? `'${customFontFaceName(activeCustomFont.id)}', 'Inter Variable', sans-serif`
        : FONT_FAMILY_VALUES.inter

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
              <Select value={store.fontFamily} onValueChange={store.setFontFamily}>
                <SelectTrigger className="w-full" style={{ fontFamily: activeFontCss }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((f) => (
                    <SelectItem key={f.key} value={f.key} style={{ fontFamily: FONT_FAMILY_VALUES[f.key] }}>
                      {f.label}
                    </SelectItem>
                  ))}
                  {store.customFonts.length > 0 && (
                    <>
                      <SelectSeparator />
                      {store.customFonts.map((f) => (
                        <SelectItem key={f.id} value={f.id} style={{ fontFamily: `'${customFontFaceName(f.id)}', 'Inter Variable', sans-serif` }}>
                          {f.fileName}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {activeCustomFont && (
                <button
                  type="button"
                  onClick={() => store.removeCustomFont(activeCustomFont.id)}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" /> Remove "{activeCustomFont.fileName}"
                </button>
              )}
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
            <Section title="Contractor / Type Breakdown" hint="Shows contractor volume for 'All'; switches to that contractor's work-type mix once one is selected.">
              <SegmentedControl options={CHART_TYPES} value={store.breakdownChartType} onChange={(t) => store.setChartType("breakdownChartType", t)} />
            </Section>
            <Section title="Value labels">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="chart-labels-toggle" className="text-sm font-medium">
                    Show on charts
                  </Label>
                  <p className="text-xs text-muted-foreground">Bars, lines and slices show their value directly.</p>
                </div>
                <Switch id="chart-labels-toggle" checked={store.chartLabelsEnabled} onCheckedChange={store.setChartLabelsEnabled} />
              </div>
              <SegmentedControl
                options={LABEL_POSITIONS}
                value={store.chartLabelPosition}
                onChange={store.setChartLabelPosition}
              />
            </Section>

            <Section title="Chart background" hint="Applies to every chart card app-wide — Dashboard, Vendor/Contract sheets, and Reports.">
              <ChartBackgroundPicker
                level={store.chartBackground}
                direction={store.chartBackgroundDirection}
                onLevelChange={store.setChartBackground}
                onDirectionChange={store.setChartBackgroundDirection}
              />
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

            <Section title="Chart data" hint="Pick what each chart is grouped by and what value it plots — changes apply immediately, everywhere that chart appears.">
              <div className="grid gap-3">
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase">Dashboard</div>
                  <div className="grid gap-2">
                    {DASHBOARD_SLOTS.map((s) => (
                      <ChartSlotRow key={s.id} {...s} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase">Vendor / Contract sheets</div>
                  <div className="grid gap-2">
                    {DETAIL_SHEET_SLOTS.map((s) => (
                      <ChartSlotRow key={s.id} {...s} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase">Financial Reports</div>
                  <div className="grid gap-2">
                    {REPORTS_SLOTS.map((s) => (
                      <ChartSlotRow key={s.id} {...s} />
                    ))}
                  </div>
                </div>
              </div>
            </Section>
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
