// Copies the inlined single-file build output into public/ so the main
// `vite build` ships it as a static asset at /ogdcl-singlefile.html
// (consumed by lib/singlefileExport.ts's "Save as HTML" feature).
import { copyFileSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"

const root = import.meta.dirname + "/.."
const src = join(root, "singlefile-dist", "index.html")
const destDir = join(root, "public")
const dest = join(destDir, "ogdcl-singlefile.html")

mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
rmSync(join(root, "singlefile-dist"), { recursive: true, force: true })

console.log(`Copied standalone single-file build to ${dest}`)
