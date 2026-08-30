import { getSupabaseClient } from "@/lib/supabase"

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
export const AVATAR_ACCEPT = ALLOWED_TYPES.join(",")

function validateAvatarFile(file: File): string | null {
  if (file.size > AVATAR_MAX_BYTES) return "Image is too large (max 2 MB)."
  if (!ALLOWED_TYPES.includes(file.type)) return "Use a PNG, JPEG, WebP, or GIF image."
  return null
}

/** Shared by the self-service upload in Settings ▸ Profile (useAuthStore.uploadAvatar)
 *  and the admin upload on the Users page — both just need a target user id and a file,
 *  and differ only in which RLS policy on storage.objects ends up granting the write
 *  (owner vs admin — see supabase/avatars_setup.sql). */
export async function uploadAvatarFile(userId: string, file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const validationError = validateAvatarFile(file)
  if (validationError) return { ok: false, error: validationError }
  const supabase = getSupabaseClient()
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  // Unique filename each upload so the public URL changes too — otherwise every
  // viewer's cached copy of the old photo (keyed by URL) would keep showing after
  // a re-upload.
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) return { ok: false, error: uploadError.message }
  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path)
  return { ok: true, url: pub.publicUrl }
}
