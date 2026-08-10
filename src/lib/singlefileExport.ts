/**
 * "Save as HTML" — rebuilt for Phase 7 using vite-plugin-singlefile (see
 * vite.config.singlefile.ts). The legacy app (index.html:1741-1838) baked a
 * frozen snapshot of the data into the page because it was local-storage-
 * primary: that snapshot was the only copy of the data, so a saved file had
 * to carry it to be useful standalone.
 *
 * This rewrite is Supabase-primary — the data always lives in the cloud, so
 * a frozen snapshot would just go stale. The equivalent feature here is
 * exporting a fully self-contained, portable copy of the *app itself* (all
 * JS/CSS inlined into one file, built by vite-plugin-singlefile) that opens
 * by double-click with no dev server and no hosting, and — like the deployed
 * site — signs in and fetches live data from Supabase when opened. That's a
 * deliberate behavior change from the legacy feature, not an oversight: it
 * trades "works fully offline with old data" for "always shows current data,
 * anywhere, with zero setup."
 */

declare global {
  interface Window {
    showSaveFilePicker?: (options: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle>
  }
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>
    requestPermission(options: { mode: "read" | "readwrite" }): Promise<"granted" | "denied" | "prompt">
    name: string
  }
  interface FileSystemWritableFileStream {
    write(data: string): Promise<void>
    close(): Promise<void>
  }
}

let savedFileHandle: FileSystemFileHandle | null = null

export interface SaveHtmlResult {
  ok: boolean
  error?: string
  savedTo?: string
}

/** Ported from saveToHtmlFile (index.html:1746-1838), minus the embedded-data splicing (see module doc above). */
export async function saveStandaloneAppAsHtml(): Promise<SaveHtmlResult> {
  let html: string
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}ogdcl-singlefile.html`)
    if (!res.ok) {
      return {
        ok: false,
        error: "Standalone export bundle not found. This is only available in a production build (npm run build), not the dev server.",
      }
    }
    html = await res.text()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  if (typeof window.showSaveFilePicker === "function") {
    try {
      if (!savedFileHandle) {
        savedFileHandle = await window.showSaveFilePicker({
          suggestedName: "OGDCL_Expenditure_Invoice_Tracker.html",
          types: [{ description: "HTML file", accept: { "text/html": [".html"] } }],
        })
      }
      const perm = await savedFileHandle.requestPermission({ mode: "readwrite" })
      if (perm !== "granted") throw new Error("Write permission was not granted.")
      const writable = await savedFileHandle.createWritable()
      await writable.write(html)
      await writable.close()
      return { ok: true, savedTo: savedFileHandle.name }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return { ok: false, error: "Save cancelled." }
      savedFileHandle = null
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  const blob = new Blob([html], { type: "text/html" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const d = new Date()
  const stamp =
    d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") +
    "-" + String(d.getHours()).padStart(2, "0") + String(d.getMinutes()).padStart(2, "0")
  a.href = url
  a.download = `OGDCL_Expenditure_Invoice_Tracker_${stamp}.html`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { ok: true, savedTo: a.download }
}
