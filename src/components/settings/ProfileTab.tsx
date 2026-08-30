import { zodResolver } from "@hookform/resolvers/zod"
import { Camera, X } from "lucide-react"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"

const schema = z.object({
  name: z.string().min(1, "Required"),
  phone: z.string().optional(),
  dept: z.string().optional(),
  designation: z.string().optional(),
})
type Values = z.infer<typeof schema>

/** Ported from the Profile settings tab (index.html:5248-5270). */
export function ProfileTab() {
  const { user, updateProfile, uploadAvatar, removeAvatar } = useAuth()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
      dept: user?.dept || "Drilling Fluids",
      designation: user?.designation || "",
    },
  })

  async function onSubmit(values: Values) {
    const r = await updateProfile(values)
    if (r.ok) toast.success("Profile updated.")
    else toast.error(r.error || "Could not update profile.")
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setUploading(true)
    const r = await uploadAvatar(file)
    setUploading(false)
    if (r.ok) toast.success("Photo updated.")
    else toast.error(r.error || "Could not upload that photo.")
  }

  async function onRemovePhoto() {
    const r = await removeAvatar()
    if (r.ok) toast.success("Photo removed.")
    else toast.error(r.error || "Could not remove the photo.")
  }

  if (!user) return null

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Profile Information</h3>
      <div className="mb-5 flex items-center gap-3">
        <div className="group/photo relative">
          <Avatar className="size-12">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback>{user.initials}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            title="Change photo"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/photo:opacity-100 disabled:opacity-100"
          >
            <Camera className="size-4" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onPhotoChange} />
        </div>
        <div>
          <div className="font-medium">{user.name}</div>
          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{user.role}</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Camera className="size-3.5" />
            {uploading ? "Uploading…" : "Change photo"}
          </Button>
          {user.avatarUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={onRemovePhoto}>
              <X className="size-3.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Sign-in Email</FormLabel>
            <FormControl>
              <Input value={user.email} disabled />
            </FormControl>
          </FormItem>
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+92 ..." {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dept"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Chief Engineer" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Save Profile
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
