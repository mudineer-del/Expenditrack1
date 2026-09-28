import { useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useKeyboardShortcutsStore } from "@/store/useKeyboardShortcutsStore"

interface Shortcut {
  keys: string[]
  description: string
  category: string
}

const SHORTCUTS: Shortcut[] = [
  // Navigation
  { keys: ["Cmd/Ctrl", "K"], description: "Open search palette", category: "Navigation" },
  { keys: ["Cmd/Ctrl", "?"], description: "Open keyboard shortcuts", category: "Navigation" },

  // Invoice Management
  { keys: ["Cmd/Ctrl", "N"], description: "Add new invoice", category: "Invoice Management" },
  { keys: ["Cmd/Ctrl", "E"], description: "Edit selected invoice", category: "Invoice Management" },
  { keys: ["Escape"], description: "Close dialog/drawer", category: "Invoice Management" },

  // General
  { keys: ["Cmd/Ctrl", "D"], description: "Toggle dark mode", category: "General" },
  { keys: ["Cmd/Ctrl", "S"], description: "Save current view layout", category: "General" },
]

const CATEGORIES = ["Navigation", "Invoice Management", "General"]

function KeyCode({ code }: { code: string }) {
  return (
    <kbd className="inline-flex items-center gap-1 rounded border border-muted bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
      {code}
    </kbd>
  )
}

export function KeyboardShortcutsDialog() {
  const open = useKeyboardShortcutsStore((s) => s.open)
  const setOpen = useKeyboardShortcutsStore((s) => s.setOpen)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "?") {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [setOpen])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {CATEGORIES.map((category) => {
            const categoryShortcuts = SHORTCUTS.filter((s) => s.category === category)
            return (
              <div key={category}>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{category}</h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                      <span className="text-sm text-foreground">{shortcut.description}</span>
                      <div className="flex gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <div key={keyIdx} className="flex items-center gap-1">
                            <KeyCode code={key} />
                            {keyIdx < shortcut.keys.length - 1 && <span className="text-xs text-muted-foreground">+</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-4 text-xs text-muted-foreground">
          <p>💡 Tip: Use Cmd/Ctrl+K to search for invoices, contracts, and vendors globally.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
