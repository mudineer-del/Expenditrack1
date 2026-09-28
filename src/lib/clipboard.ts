import { toast } from "sonner"

/**
 * Copy text to clipboard and show a toast notification.
 * Gracefully handles browsers that don't support clipboard API.
 */
export async function copyToClipboard(text: string, label?: string) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      // Fallback for older browsers
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
    }
    toast.success(`Copied${label ? ` ${label}` : ""}`, { duration: 2000 })
  } catch (err) {
    console.error("Failed to copy:", err)
    toast.error("Failed to copy to clipboard")
  }
}
