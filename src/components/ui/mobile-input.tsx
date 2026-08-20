import React from "react"
import { Input } from "./input"
import { cn } from "@/lib/utils"

interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputMode?: "text" | "none" | "decimal" | "numeric" | "tel" | "search" | "email" | "url"
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send"
  autoComplete?: string
}

/** Input component with mobile keyboard optimization hints.
 *  Adds inputMode, enterKeyHint, and autocapitalize/autocorrect for better mobile UX */
export const MobileInput = React.forwardRef<HTMLInputElement, MobileInputProps>(
  ({ inputMode, enterKeyHint, autoComplete, className, ...props }, ref) => {
    const getAutoAttributes = () => {
      if (props.type === "email") {
        return {
          autoComplete: autoComplete || "email",
          inputMode: inputMode || "email",
          autoCapitalize: "off",
          autoCorrect: "off",
          spellCheck: false,
        }
      }
      if (props.type === "search") {
        return {
          autoComplete: autoComplete || "off",
          inputMode: inputMode || "search",
          autoCapitalize: "off",
          autoCorrect: "off",
          spellCheck: false,
        }
      }
      if (props.type === "number") {
        return {
          inputMode: inputMode || "numeric",
          autoComplete: autoComplete || "off",
        }
      }
      if (props.type === "tel") {
        return {
          autoComplete: autoComplete || "tel",
          inputMode: inputMode || "tel",
        }
      }
      if (props.type === "url") {
        return {
          autoComplete: autoComplete || "url",
          inputMode: inputMode || "url",
          autoCapitalize: "off",
          autoCorrect: "off",
          spellCheck: false,
        }
      }
      return {
        autoComplete: autoComplete,
        inputMode: inputMode,
        autoCapitalize: "off",
        autoCorrect: "off",
        spellCheck: false,
      }
    }

    return (
      <Input
        ref={ref}
        className={cn("text-base", className)}
        enterKeyHint={enterKeyHint}
        {...getAutoAttributes()}
        {...props}
      />
    )
  }
)

MobileInput.displayName = "MobileInput"
