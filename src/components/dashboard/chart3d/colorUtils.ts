/** Three.js materials need a real color (hex/rgb/named), not a CSS custom-property
 *  reference — this resolves `var(--dataviz-1)` (or any valid CSS color string) against
 *  the live document by letting the browser's own cascade do the work, the same values the
 *  app's SVG charts already read. Not cached across calls: the resolved value must track
 *  theme switches (light/dark, custom accent palettes), and this is only ever called when
 *  building a scene's materials, not per animation frame. */
export function resolveCssColor(input: string): string {
  if (typeof document === "undefined" || !input.includes("var(")) return input
  const probe = document.createElement("span")
  probe.style.color = input
  probe.style.position = "absolute"
  probe.style.visibility = "hidden"
  probe.style.pointerEvents = "none"
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color || "#888888"
  document.body.removeChild(probe)
  return resolved
}
