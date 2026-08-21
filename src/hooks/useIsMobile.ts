import { useEffect, useState } from "react"

/** Matches the app's md breakpoint so mobile-only visual treatments never leak into desktop. */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setIsMobile(media.matches)
    update()

    if (media.addEventListener) media.addEventListener("change", update)
    else media.addListener(update)

    return () => {
      if (media.removeEventListener) media.removeEventListener("change", update)
      else media.removeListener(update)
    }
  }, [])

  return isMobile
}
