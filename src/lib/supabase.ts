import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { storeGet, storeSet } from "@/lib/localCache"

export interface SbConfig {
  url: string
  anonKey: string
}

const SB_ENV: SbConfig = {
  url: import.meta.env.VITE_SUPABASE_URL?.trim() ?? "",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "",
}

const CONFIG_KEY = "sbConfig"

// supabase-js throws synchronously from createClient() on an empty URL — with no
// config yet (no VITE_SUPABASE_* at build time and nothing saved in Settings →
// Cloud Sync), that exception was escaping from useAuthStore's initialize(), which
// runs on app boot before React even renders the login screen, so the whole app
// crashed to a blank white page instead of letting the user reach the sign-in
// or settings UI. A syntactically-valid placeholder keeps createClient happy;
// real Supabase calls still fail (network error), which existing per-page
// isError states already surface, e.g. "Check your connection to Supabase in
// Settings → Cloud Sync."
const PLACEHOLDER_URL = "https://placeholder-project.supabase.co"
const PLACEHOLDER_KEY = "placeholder-anon-key"

let client: SupabaseClient | null = null
let currentConfig: SbConfig | null = null

function loadConfig(): SbConfig {
  const stored = storeGet<SbConfig>(CONFIG_KEY)
  if (stored?.url && stored.anonKey) return stored
  return SB_ENV
}

export function getSupabaseClient(): SupabaseClient {
  if (client && currentConfig) return client
  currentConfig = loadConfig()
  client = createClient(currentConfig.url || PLACEHOLDER_URL, currentConfig.anonKey || PLACEHOLDER_KEY, {
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
  return !!SB_ENV.url && cfg.url === SB_ENV.url
}

export function getSbConfig(): SbConfig {
  return currentConfig ?? loadConfig()
}
