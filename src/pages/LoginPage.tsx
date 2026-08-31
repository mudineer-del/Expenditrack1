import { useState } from "react"
import { Navigate } from "react-router-dom"
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm"
import { LoginForm } from "@/components/auth/LoginForm"
import { SignUpForm } from "@/components/auth/SignUpForm"
import { OgdclLogoFull } from "@/components/shared/OgdclMark"
import { useAuth } from "@/hooks/useAuth"
import { useLabelsStore } from "@/store/useLabelsStore"
import rigPhoto from "@/assets/ogdcl-rig.jpg"

type Mode = "login" | "signup" | "forgot"

const COPY: Record<Mode, { title: string; description: string }> = {
  login: { title: "Sign in", description: "Access the OGDCL Drilling Fluids expenditure tracker." },
  signup: { title: "Request access", description: "An admin will review and enable your account before you can sign in." },
  forgot: { title: "Reset password", description: "We'll email you a link to reset it." },
}

const MARKERS = [
  "Invoice capture, vendor by vendor",
  "Contract commitments tracked against spend",
  "Every change logged and auditable",
]

export default function LoginPage() {
  const { status } = useAuth()
  const [mode, setMode] = useState<Mode>("login")
  const loginTitle = useLabelsStore((s) => s.loginTitle)

  // Pending/disabled accounts still have a real session — send them through "/"
  // like anyone else so RequireAuth shows AccountPendingPage instead of this
  // form again, rather than leaving them stuck looking like they need to sign in.
  if (status === "authenticated" || status === "pending" || status === "disabled") return <Navigate to="/" replace />

  return (
    <div
      className="min-h-svh md:grid md:grid-cols-[1.05fr_1fr]"
      style={{ "--login-rig": `url(${rigPhoto})` } as React.CSSProperties}
    >
      {/* ---------- brand panel: desktop only ---------- */}
      <section className="login-brand-bg relative hidden flex-col justify-between overflow-hidden p-11 md:flex">
        <OgdclLogoFull className="w-32 shadow-[0_10px_30px_rgba(0,0,0,0.45)]" />

        <div className="relative max-w-[500px]">
          <span className="mb-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ogdcl-green)]">
            <span className="h-px w-6 bg-[var(--ogdcl-green)] opacity-65" />
            Drilling Fluids
          </span>
          <h1 className="text-balance text-[clamp(1.875rem,3.2vw,2.7rem)] font-bold leading-[1.1] tracking-[-0.022em] text-white">
            Every dollar downhole, <em className="not-italic text-[var(--ogdcl-green)]">accounted for.</em>
          </h1>
          <p className="mt-5 max-w-[410px] text-[15px] leading-relaxed text-[#9FB6C9]">
            {loginTitle} consolidates drilling fluids expenditure across vendors,
            contracts and departments into a single ledger &mdash; reconciled daily,
            not quarterly.
          </p>
        </div>

        <ul className="relative flex flex-col gap-3 border-t border-white/15 pt-6">
          {MARKERS.map((text, i) => (
            <li key={text} className="flex items-baseline gap-3 text-[13.5px] text-[#EAF2F8]">
              <span className="min-w-5 text-[10.5px] font-bold tracking-[0.1em] text-[var(--ogdcl-green)] tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              {text}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- form pane ---------- */}
      <main className="login-photo-bg flex min-h-svh flex-col md:min-h-0 md:items-center md:justify-center md:bg-background md:p-10">
        {/* logo + eyebrow sit on the photo, above the sheet — mobile only */}
        <div className="px-6 pt-10 md:hidden" style={{ paddingTop: "calc(2.5rem + env(safe-area-inset-top))" }}>
          <OgdclLogoFull className="w-[108px] shadow-[0_10px_30px_rgba(0,0,0,0.45)]" />
          <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white [text-shadow:0_1px_6px_rgba(7,26,43,0.55)]">
            <span className="h-px w-6 bg-[var(--ogdcl-green)]" />
            Drilling Fluids
          </span>
        </div>

        {/* the sheet: rides over the photo on mobile, plain panel on desktop */}
        <div className="mt-auto rounded-t-[28px] bg-background px-6 pb-[calc(1.625rem+env(safe-area-inset-bottom))] pt-8 shadow-[0_-14px_44px_rgba(7,26,43,0.26)] md:mt-0 md:w-full md:max-w-sm md:rounded-2xl md:border md:px-8 md:py-9 md:shadow-lg">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-left">
            {COPY[mode].title}
          </h2>
          <p className="mx-auto mt-2 mb-7 max-w-[30ch] text-center text-sm text-muted-foreground md:mx-0 md:text-left">
            {COPY[mode].description}
          </p>

          {mode === "login" && (
            <LoginForm onForgotPassword={() => setMode("forgot")} onSignUp={() => setMode("signup")} />
          )}
          {mode === "signup" && <SignUpForm onBackToLogin={() => setMode("login")} />}
          {mode === "forgot" && <ForgotPasswordForm onBackToLogin={() => setMode("login")} />}

          <p className="mt-8 border-t pt-5 text-center text-xs leading-relaxed text-muted-foreground md:text-left">
            Authorised personnel only &middot; Oil &amp; Gas Development Company Limited
          </p>
        </div>
      </main>
    </div>
  )
}
