import { useAuthStore } from "@/store/useAuthStore"
import { can } from "@/lib/can"
import type { Action } from "@/types/user"

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

  return {
    status,
    user,
    error,
    isRecovery,
    clearRecovery,
    isAdmin: user?.role === "Admin",
    can: (action: Action) => can(user?.role, action),
    signIn,
    signUp,
    signOut,
    sendRecovery,
    updatePassword,
    updateProfile,
  }
}
