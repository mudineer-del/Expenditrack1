import { Check, Monitor, Moon, Palette, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { PALETTES } from "@/lib/colorPalettes"
import { useDisplayStore } from "@/store/useDisplayStore"

const MODES = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
] as const

export function AppearanceTab() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const colorTheme = useDisplayStore((s) => s.colorTheme)
  const setColorTheme = useDisplayStore((s) => s.setColorTheme)

  useEffect(() => setMounted(true), [])

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Palette className="size-4 text-primary" />Theme</CardTitle>
          <CardDescription>Choose the visual family used by surfaces, accents, charts, and semantic status colors.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {PALETTES.map((palette) => {
            const active = colorTheme === palette.id
            return (
              <button
                key={palette.id}
                type="button"
                aria-pressed={active}
                onClick={() => setColorTheme(palette.id)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                  active ? "border-primary bg-primary/5 ring-2 ring-primary/25" : "hover:border-primary/50"
                )}
              >
                <div className="mb-3 h-14 rounded-lg border" style={{ background: "linear-gradient(135deg, " + palette.light.background + ", " + palette.dark.background + ")" }}>
                  <span className="flex h-full items-center justify-end gap-1.5 px-3">
                    {[palette.swatch, palette.dark.dataviz2, palette.dark.statusCleared, palette.dark.statusUnder, palette.dark.statusReturned].map((color) => (
                      <span key={color} className="size-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} />
                    ))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{palette.label}</span>
                  {active && <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3.5" /></span>}
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{palette.description}</p>
              </button>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Display mode</CardTitle>
          <CardDescription>Use the selected theme in light, dark, or system mode.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={mounted && theme === id}
              onClick={() => setTheme(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                mounted && theme === id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-4" />{label}
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

