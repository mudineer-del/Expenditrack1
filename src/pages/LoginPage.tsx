import { useState } from "react"
import { Navigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import { LoginForm } from "@/components/auth/LoginForm"
import { SignUpForm } from "@/components/auth/SignUpForm"
import { OgdclLogoFull } from "@/components/shared/OgdclMark"
import { useAuth } from "@/hooks/useAuth"
import { useLabelsStore } from "@/store/useLabelsStore"

type Mode = "login" | "signup" | "forgot"

const COPY: Record<Mode, { description: string }> = {
  login: { description: "Access the OGDCL Drilling Fluids expenditure tracker." },
  signup: { description: "New accounts start with Viewer access." },
  forgot: { description: "We'll email you a link to reset it." },
}

export default function LoginPage() {
  const { status } = useAuth()
  const [mode, setMode] = useState<Mode>("login")
  const loginTitle = useLabelsStore((s) => s.loginTitle)

  if (status === "authenticated") return <Navigate to="/" replace />

  return (
    <div
      className="flex min-h-svh items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(circle at 15% 15%, color-mix(in oklch, var(--chart-1) 12%, var(--background)), var(--background) 55%), radial-gradient(circle at 85% 85%, color-mix(in oklch, var(--chart-2) 10%, var(--background)), var(--background) 55%)",
      }}
    >
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="items-center text-center">
          <OgdclLogoFull className="mb-2" />
          <CardTitle className="text-xl text-primary">{loginTitle}</CardTitle>
          <CardDescription>{COPY[mode].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" && (
            <LoginForm onForgotPassword={() => setMode("forgot")} onSignUp={() => setMode("signup")} />
          )}
          {mode === "signup" && <SignUpForm onBackToLogin={() => setMode("login")} />}
          {mode === "forgot" && <ForgotPasswordForm onBackToLogin={() => setMode("login")} />}
        </CardContent>
      </Card>
    </div>
  )
}
