import { useState } from "react"
import { Navigate } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import { LoginForm } from "@/components/auth/LoginForm"
import { SignUpForm } from "@/components/auth/SignUpForm"
import { useAuth } from "@/hooks/useAuth"

type Mode = "login" | "signup" | "forgot"

const COPY: Record<Mode, { title: string; description: string }> = {
  login: { title: "Sign in", description: "Access the OGDCL Drilling Fluids expenditure tracker." },
  signup: { title: "Create an account", description: "New accounts start with Viewer access." },
  forgot: { title: "Reset your password", description: "We'll email you a link to reset it." },
}

export default function LoginPage() {
  const { status } = useAuth()
  const [mode, setMode] = useState<Mode>("login")

  if (status === "authenticated") return <Navigate to="/" replace />

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-primary">OGDCL Drilling Fluids</CardTitle>
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
