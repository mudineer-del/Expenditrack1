import { Eye, EyeOff } from "lucide-react"
import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** An <Input type="password"> with a show/hide toggle. */
function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-8", className)} {...props} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
      </button>
    </div>
  )
}

export { PasswordInput }
