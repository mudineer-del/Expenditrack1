import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"
export const DIALOG_DESIGNS = [
  { value: "executive", label: "01 · Executive form", hint: "A clear two-column form with a themed header." },
  { value: "summary", label: "02 · Split summary", hint: "Invoice fields with a live financial summary alongside." },
  { value: "guided", label: "03 · Guided steps", hint: "Details, amounts, then a review before saving." },
  { value: "tabbed", label: "04 · Tabbed workspace", hint: "Switch sections in a resizable, maximizable window." },
  { value: "cards", label: "05 · Layered cards", hint: "Raised sections with subtle depth and themed borders." },
] as const
export type DialogDesign = typeof DIALOG_DESIGNS[number]["value"]
const saved = storeGet<{ design: DialogDesign }>("dialogPrefs")
const initial = DIALOG_DESIGNS.some((d) => d.value === saved?.design) ? saved!.design : "executive"
export const useDialogPrefsStore = create<{ design: DialogDesign; setDesign: (design: DialogDesign) => void }>((set) => ({
  design: initial,
  setDesign: (design) => { set({ design }); storeSet("dialogPrefs", { design }) },
}))
