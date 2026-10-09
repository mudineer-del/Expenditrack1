export interface CustomIcon {
  id: string
  src: string
  label: string
}

const STORAGE_KEY = "customIcons3d"

export function getCustomIcons(): CustomIcon[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveCustomIcon(icon: CustomIcon): void {
  try {
    const icons = getCustomIcons()
    const updated = [...icons, icon]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error("Could not save custom icon:", e)
  }
}

export function deleteCustomIcon(id: string): void {
  try {
    const icons = getCustomIcons()
    const updated = icons.filter((i) => i.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error("Could not delete custom icon:", e)
  }
}

export function getCustomIcon(id: string): CustomIcon | undefined {
  return getCustomIcons().find((i) => i.id === id)
}
