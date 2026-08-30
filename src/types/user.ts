export type Role = "Admin" | "Editor" | "Viewer"

export interface AppUser {
  id: string
  email: string
  name: string
  role: Role
  initials: string
  phone?: string
  dept?: string
  designation?: string
  twofa?: boolean
  avatarUrl?: string
}

export type Action = "add" | "edit" | "delete" | "export"
export type Resource = "invoice" | "contract" | "well" | "wellCostEntry"
