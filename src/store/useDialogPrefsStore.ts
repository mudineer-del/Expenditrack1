import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"
export const DIALOG_DESIGNS = [
  { value: "executive", label: "01 · Executive form", hint: "A clean surface with a strong themed header." },
  { value: "summary", label: "02 · Split summary", hint: "A contrasting header and body; invoice entry adds a live summary." },
  { value: "guided", label: "03 · Guided steps", hint: "A focused accent and clear actions; invoice entry uses guided steps." },
  { value: "tabbed", label: "04 · Tabbed workspace", hint: "A compact workspace style; invoice entry adds tabs and window controls." },
  { value: "cards", label: "05 · Layered cards", hint: "Raised surfaces with subtle depth and themed borders." },
] as const
export type DialogDesign = typeof DIALOG_DESIGNS[number]["value"]
const saved = storeGet<{ design: DialogDesign }>("dialogPrefs")
const initial = DIALOG_DESIGNS.some((d) => d.value === saved?.design) ? saved!.design : "executive"
export const useDialogPrefsStore = create<{ design: DialogDesign; setDesign: (design: DialogDesign) => void }>((set) => ({
  design: initial,
  setDesign: (design) => { set({ design }); storeSet("dialogPrefs", { design }) },
}))
