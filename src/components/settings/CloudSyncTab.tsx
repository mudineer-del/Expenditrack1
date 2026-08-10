import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSbConfig, isUsingDefaultProject, reconfigureSupabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"

/**
 * Ported from the Cloud Sync settings tab (index.html:5367-5446), scaled
 * down to match this rewrite's architecture: the legacy app was local-
 * storage-primary with an optional cloud project to push/pull to, so that
 * tab had a push/pull reconciliation flow. This app is Supabase-primary
 * from the start (every page reads/writes it directly), so there's nothing
 * to push or pull — the only real setting left is which Supabase project to
 * point at, which is what this tab exposes.
 */
export function CloudSyncTab() {
  const { user } = useAuth()
  const cfg = getSbConfig()
  const usingDefault = isUsingDefaultProject()
  const [url, setUrl] = useState(cfg.url)
  const [anonKey, setAnonKey] = useState(cfg.anonKey)

  function handleSave() {
    if (!url.trim() || !anonKey.trim()) {
      toast.error("Enter both the project URL and the anon key.")
      return
    }
    if (!/^https:\/\/.+/.test(url.trim())) {
      toast.error("Project URL should start with https://")
      return
    }
    reconfigureSupabase(url, anonKey)
    toast.success("Connection updated. Reloading…")
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold">Connection Status</h3>
        <div className="divide-y text-sm">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium">Project</div>
              <div className="text-xs text-muted-foreground">{cfg.url}</div>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {usingDefault ? "Default project" : "Custom project"}
            </span>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="font-medium">Signed in as</div>
            <span className="text-xs text-muted-foreground">{user?.email || "—"}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold">Change Supabase Project</h3>
        <p className="mb-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Only change this if you're moving to a different Supabase project. Run <code>OGDCL_Supabase_Setup.sql</code>{" "}
          in the new project's SQL Editor first, then copy the Project URL and anon public key from{" "}
          <b>Project Settings → API</b>. Reconnecting reloads the app and signs everyone using the old project out.
        </p>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Project URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxxxxxx.supabase.co" />
          </div>
          <div className="grid gap-1.5">
            <Label>Anon public key</Label>
            <Input value={anonKey} onChange={(e) => setAnonKey(e.target.value)} placeholder="eyJhbGciOi..." />
          </div>
        </div>
        <Button className="mt-4" onClick={handleSave}>
          Save &amp; reconnect
        </Button>
      </div>
    </div>
  )
}
