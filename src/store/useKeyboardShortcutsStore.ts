import { create } from "zustand"

interface KeyboardShortcutsState {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useKeyboardShortcutsStore = create<KeyboardShortcutsState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))
