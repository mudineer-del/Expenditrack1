import { Check, Save } from "lucide-react"
import { useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useDashboardLayoutQuery, useSaveDashboardLayout } from "@/hooks/useDashboardLayout"
import { errorMessage } from "@/lib/utils"
import { getSyncablePrefs, useDisplayStore } from "@/store/useDisplayStore"

/** Explicit "commit to the cloud" button for the whole Settings ▸ Format surface (colors,
 *  chart types, per-slot chart config, table style) — chart-type/layout picks already apply
 *  and persist locally the instant you make them (today's behavior, unchanged), but that's
 *  only ever this one browser's local storage. Clicking here writes the current live layout
 *  to the signed-in user's own row (supabase/dashboard_layouts_setup.sql), which is what
 *  every login re-hydrates from — so it's what actually follows you to another device or
 *  browser, or survives this one's storage being cleared. */
export function SaveLayoutButton() {
  const live = useDisplayStore((s) => s)
  const layoutQuery = useDashboardLayoutQuery()
  const saveLayout = useSaveDashboardLayout()

  const liveJson = useMemo(() => JSON.stringify(getSyncablePrefs(live)), [live])
  const savedJson = layoutQuery.data ? JSON.stringify(layoutQuery.data.prefs) : null
  const isDirty = savedJson === null || liveJson !== savedJson

  function handleSave() {
    saveLayout.mutate(getSyncablePrefs(live), {
      onSuccess: () => toast.success("Layout saved — this now follows your account to any device."),
      onError: (e) => toast.error(errorMessage(e, "Could not save layout.")),
    })
  }

  return (
    <div className="flex items-center gap-2">
      {!isDirty && layoutQuery.data && (
        <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Check className="size-3.5 text-status-cleared" /> Saved
        </span>
      )}
      <Button
        size="sm"
        variant={isDirty ? "default" : "outline"}
        disabled={!isDirty || saveLayout.isPending}
        title={isDirty ? "Save this layout to your account" : "No changes since your last save"}
        onClick={handleSave}
      >
        <Save /> {saveLayout.isPending ? "Saving…" : "Save Layout"}
      </Button>
    </div>
  )
}
