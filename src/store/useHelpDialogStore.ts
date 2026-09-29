import { create } from "zustand"

interface HelpDialogStore {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useHelpDialogStore = create<HelpDialogStore>((set) => ({
  open: false,
  setOpen: (open: boolean) => set({ open }),
}))
