const LS_PREFIX = "ogdcl:"

declare global {
  interface Window {
    __OGDCL_EMBEDDED__?: Record<string, unknown>
  }
}

function lsAvailable(): boolean {
  try {
    const k = "__ogdcl_test__"
    window.localStorage.setItem(k, "1")
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

export const saveHealth = {
  ok: true,
  lastError: "",
  lastSaved: null as Date | null,
}

/**
 * Ported from the legacy app's storeGet/storeSet (index.html:1209-1272).
 * Drops the legacy "window.storage" host-embedding abstraction (specific to
 * the tool the original app was built in) but keeps the localStorage layer
 * and the window.__OGDCL_EMBEDDED__ fallback — the latter is what lets a
 * "Save as HTML" single-file export (see Phase 7) open with its own data
 * baked in even with empty browser storage.
 */
export function storeGet<T>(key: string): T | null {
  if (lsAvailable()) {
    try {
      const raw = window.localStorage.getItem(LS_PREFIX + key)
      if (raw) return JSON.parse(raw) as T
    } catch {
      // fall through
    }
  }
  if (
    typeof window !== "undefined" &&
    window.__OGDCL_EMBEDDED__ &&
    Object.prototype.hasOwnProperty.call(window.__OGDCL_EMBEDDED__, key)
  ) {
    return window.__OGDCL_EMBEDDED__[key] as T
  }
  return null
}

export function storeSet<T>(key: string, value: T): boolean {
  const json = JSON.stringify(value)
  let localOk = false
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(LS_PREFIX + key, json)
      localOk = window.localStorage.getItem(LS_PREFIX + key) === json
      if (!localOk) saveHealth.lastError = "The browser accepted the save but did not keep it."
    } else {
      saveHealth.lastError = "This browser provides no local storage for this page."
    }
  } catch (e) {
    localOk = false
    const name = (e as { name?: string })?.name || ""
    saveHealth.lastError =
      name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED"
        ? "Browser storage is full. Download a backup, then remove old data."
        : `Browser blocked saving data (${name || "error"}). Private/incognito mode can cause this.`
  }
  saveHealth.ok = localOk
  if (localOk) {
    saveHealth.lastSaved = new Date()
    saveHealth.lastError = ""
  }
  return localOk
}

export function storeRemove(key: string): void {
  try {
    window.localStorage.removeItem(LS_PREFIX + key)
  } catch {
    // ignore
  }
}
