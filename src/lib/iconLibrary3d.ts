/** Curated 3D icon library for the sidebar icon picker (Settings → Labels → Sidebar
 *  Customization) — see src/components/settings/IconPickerDialog.tsx. All 92 PNGs in
 *  src/assets/icons-3d/ are MIT-licensed, from microsoft/fluentui-emoji
 *  (https://github.com/microsoft/fluentui-emoji), same source as the two icons already
 *  used for the Well Cost nav (well-cost-nav-icon-3d.png etc.) and the department
 *  switcher (department-icon-3d.png / all-departments-icon-3d.png — kept as separate
 *  hand-picked defaults rather than folded into this list, since they're already wired
 *  as the out-of-the-box look, not picker options).
 *
 *  This is a deliberately curated subset (~90 icons spanning business, finance, tools,
 *  communication, security, and general-purpose categories) rather than the full
 *  ~1500-icon Fluent set, which would add tens of MB to the repo for icons this app's
 *  sidebar would never plausibly need — see the plan discussion for why. */

const modules = import.meta.glob("../assets/icons-3d/*.png", { eager: true, import: "default" }) as Record<string, string>

const LABELS: Record<string, string> = {
  "airplane": "Airplane",
  "alarm_clock": "Alarm clock",
  "anchor": "Anchor",
  "artist_palette": "Artist palette",
  "bank": "Bank",
  "bar_chart": "Bar chart",
  "battery": "Battery",
  "bell": "Bell",
  "bookmark": "Bookmark",
  "bookmark_tabs": "Bookmark tabs",
  "books": "Books",
  "bust_in_silhouette": "Bust in silhouette",
  "busts_in_silhouette": "Busts in silhouette",
  "calendar": "Calendar",
  "camera": "Camera",
  "card_index": "Card index",
  "card_index_dividers": "Card index dividers",
  "chains": "Chains",
  "chart_decreasing": "Chart decreasing",
  "chart_increasing": "Chart increasing",
  "classical_building": "Classical building",
  "clipboard": "Clipboard",
  "cloud": "Cloud",
  "coin": "Coin",
  "compass": "Compass",
  "credit_card": "Credit card",
  "delivery_truck": "Delivery truck",
  "dollar_banknote": "Dollar banknote",
  "e-mail": "E-mail",
  "envelope": "Envelope",
  "factory": "Factory",
  "file_folder": "File folder",
  "fire": "Fire",
  "fuel_pump": "Fuel pump",
  "gear": "Gear",
  "gem_stone": "Gem stone",
  "glowing_star": "Glowing star",
  "graduation_cap": "Graduation cap",
  "hammer": "Hammer",
  "hammer_and_wrench": "Hammer and wrench",
  "handshake": "Handshake",
  "high_voltage": "High voltage",
  "hourglass_done": "Hourglass done",
  "inbox_tray": "Inbox tray",
  "incoming_envelope": "Incoming envelope",
  "key": "Key",
  "ledger": "Ledger",
  "light_bulb": "Light bulb",
  "locked": "Locked",
  "loudspeaker": "Loudspeaker",
  "magnifying_glass_tilted_right": "Magnifying glass tilted right",
  "megaphone": "Megaphone",
  "microscope": "Microscope",
  "mobile_phone": "Mobile phone",
  "money_bag": "Money bag",
  "money_with_wings": "Money with wings",
  "mountain": "Mountain",
  "necktie": "Necktie",
  "newspaper": "Newspaper",
  "notebook": "Notebook",
  "nut_and_bolt": "Nut and bolt",
  "oil_drum": "Oil drum",
  "old_key": "Old key",
  "open_file_folder": "Open file folder",
  "outbox_tray": "Outbox tray",
  "package": "Package",
  "page_facing_up": "Page facing up",
  "people_hugging": "People hugging",
  "puzzle_piece": "Puzzle piece",
  "receipt": "Receipt",
  "rescue_workers_helmet": "Rescue workers helmet",
  "rocket": "Rocket",
  "sailboat": "Sailboat",
  "satellite": "Satellite",
  "scroll": "Scroll",
  "shield": "Shield",
  "ship": "Ship",
  "sparkles": "Sparkles",
  "speech_balloon": "Speech balloon",
  "spiral_calendar": "Spiral calendar",
  "star": "Star",
  "stop_sign": "Stop sign",
  "sun": "Sun",
  "telephone": "Telephone",
  "test_tube": "Test tube",
  "toolbox": "Toolbox",
  "trophy": "Trophy",
  "unlocked": "Unlocked",
  "video_camera": "Video camera",
  "warning": "Warning",
  "world_map": "World map",
  "wrench": "Wrench",
}

export interface Icon3D {
  id: string
  label: string
  src: string
}

export const ICONS_3D: Icon3D[] = Object.entries(modules)
  .map(([path, src]) => {
    const id = path.split("/").pop()!.replace(/_3d\.png$/, "")
    return { id, label: LABELS[id] ?? id, src }
  })
  .sort((a, b) => a.label.localeCompare(b.label))

export const ICONS_3D_BY_ID: Record<string, Icon3D> = Object.fromEntries(ICONS_3D.map((i) => [i.id, i]))
