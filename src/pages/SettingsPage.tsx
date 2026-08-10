import { Bell, Cloud, Database, Key, Shield, Tags, User } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { BackupTab } from "@/components/settings/BackupTab"
import { CloudSyncTab } from "@/components/settings/CloudSyncTab"
import { NotificationsTab } from "@/components/settings/NotificationsTab"
import { PasswordTab } from "@/components/settings/PasswordTab"
import { ProfileTab } from "@/components/settings/ProfileTab"
import { ReferenceListsTab } from "@/components/settings/ReferenceListsTab"
import { SecurityTab } from "@/components/settings/SecurityTab"

type TabKey = "profile" | "security" | "password" | "notifications" | "backup" | "lists" | "cloud"

const BASE_TABS: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "security", label: "Security", icon: Shield },
  { key: "password", label: "Password", icon: Key },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "backup", label: "Data & Backup", icon: Database },
]
const ADMIN_TABS: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: "lists", label: "Reference Lists", icon: Tags },
  { key: "cloud", label: "Cloud Sync", icon: Cloud },
]

/**
 * Ported from renderSettings/renderSettingsTab (index.html:5220-5237 and its
 * per-tab bodies). The legacy Appearance (accent color/density picker) and
 * Titles & Labels (custom UI-text editor with a font/color format dialog)
 * tabs are deliberately not ported — they're cosmetic theme editors with low
 * functional value relative to their build cost, out of scope for this pass.
 */
export default function SettingsPage() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<TabKey>("profile")
  const tabs = isAdmin ? [...BASE_TABS, ...ADMIN_TABS] : BASE_TABS

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
      <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </nav>
      <div>
        {tab === "profile" && <ProfileTab />}
        {tab === "security" && <SecurityTab />}
        {tab === "password" && <PasswordTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "backup" && <BackupTab />}
        {tab === "lists" && isAdmin && <ReferenceListsTab />}
        {tab === "cloud" && isAdmin && <CloudSyncTab />}
      </div>
    </div>
  )
}
