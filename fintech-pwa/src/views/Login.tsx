import { useState, type FormEvent } from "react"
import { useAuth } from "../lib/useAuth"

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    const res = await signIn(email, password)
    setBusy(false)
    if (!res.ok) setError(res.error || "Sign in failed.")
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="login-brand">
          <div className="login-logo">OG</div>
          <div>
            <div className="login-title">Expenditrack</div>
            <div className="login-subtitle">Fintech</div>
          </div>
        </div>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <div className="login-error">{error}</div>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  )
}
