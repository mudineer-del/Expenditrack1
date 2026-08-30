import { useAuthStore } from "@/store/useAuthStore"
import { can } from "@/lib/can"
import type { Action, Resource } from "@/types/user"

export function useAuth() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const error = useAuthStore((s) => s.error)
  const isRecovery = useAuthStore((s) => s.isRecovery)
  const clearRecovery = useAuthStore((s) => s.clearRecovery)
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const signOut = useAuthStore((s) => s.signOut)
  const sendRecovery = useAuthStore((s) => s.sendRecovery)
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar)
  const removeAvatar = useAuthStore((s) => s.removeAvatar)

  return {
    status,
    user,
    error,
    isRecovery,
    clearRecovery,
    isAdmin: user?.role === "Admin",
    can: (action: Action, resource?: Resource) => can(user?.role, action, resource),
    signIn,
    signUp,
    signOut,
    sendRecovery,
    updatePassword,
    updateProfile,
    uploadAvatar,
    removeAvatar,
  }
}
