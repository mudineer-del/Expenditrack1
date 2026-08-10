import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { storeGet, storeSet } from "@/lib/localCache"

export interface SbConfig {
  url: string
  anonKey: string
}

/**
 * Built-in default project connection so the app works out of the box.
 * The anon key is meant to be public in client-side code — real protection
 * comes from Row Level Security policies on the Supabase tables, not from
 * hiding this key. (Same default used by the legacy app, index.html:1301.)
 */
const SB_DEFAULT: SbConfig = {
  url: "https://mwgzyguymlqyvroivhsf.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13Z3p5Z3V5bWxxeXZyb2l2aHNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NzQ1NjksImV4cCI6MjEwMDQ1MDU2OX0.seJUeVuOr1E3-pDQPIkhF6di8_gF0sty87sZp3dvEDg",
}

const CONFIG_KEY = "sbConfig"

let client: SupabaseClient | null = null
let currentConfig: SbConfig | null = null

function loadConfig(): SbConfig {
  const stored = storeGet<SbConfig>(CONFIG_KEY)
  if (stored?.url && stored.anonKey) return stored
  return SB_DEFAULT
}

export function getSupabaseClient(): SupabaseClient {
  if (client && currentConfig) return client
  currentConfig = loadConfig()
  client = createClient(currentConfig.url, currentConfig.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return client
}

/** Tears down and rebuilds the client — used when Settings → Cloud Sync changes the project. */
export function reconfigureSupabase(url: string, anonKey: string): SupabaseClient {
  const cfg: SbConfig = { url: url.trim(), anonKey: anonKey.trim() }
  storeSet(CONFIG_KEY, cfg)
  currentConfig = cfg
  client = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return client
}

export function isUsingDefaultProject(): boolean {
  const cfg = currentConfig ?? loadConfig()
  return cfg.url === SB_DEFAULT.url
}

export function getSbConfig(): SbConfig {
  return currentConfig ?? loadConfig()
}
