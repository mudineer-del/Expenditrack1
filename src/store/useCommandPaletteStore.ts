import { create } from "zustand"

interface CommandPaletteState {
  open: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

/** Lets both the global Ctrl/Cmd+K listener (in CommandPalette itself) and the header's
 *  visible "Search" button open the same palette instance. */
export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
