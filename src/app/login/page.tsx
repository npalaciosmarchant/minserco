"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { getSupabase } from "@/lib/supabase"
import Image from "next/image"
import { Lock, Mail, AlertCircle, Eye, EyeOff, Shield, Cpu, BarChart3, ArrowLeft, CheckCircle2 } from "lucide-react"

const features = [
  { icon: Shield,    label: "Trazabilidad completa",   desc: "Registro auditado de cada acción operacional" },
  { icon: Cpu,       label: "Gestión en tiempo real",  desc: "Estado actualizado de equipos, técnicos y stock" },
  { icon: BarChart3, label: "Reportes y KPIs",         desc: "Dashboards operacionales para toma de decisiones" },
]

type Vista = "login" | "recuperar"

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [vista, setVista] = useState<Vista>("login")

  // Login
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Recuperar contraseña
  const [emailRecuperar, setEmailRecuperar] = useState("")
  const [enviado, setEnviado] = useState(false)
  const [errorRecuperar, setErrorRecuperar] = useState("")
  const [loadingRecuperar, setLoadingRecuperar] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const { ok, error: err } = await login(email.trim(), password)
      if (ok) router.push("/")
      else setError(err ?? "Credenciales incorrectas o usuario inactivo.")
    } catch {
      setError("Error inesperado. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault()
    setErrorRecuperar("")
    if (!emailRecuperar.trim()) { setErrorRecuperar("Ingresa tu correo electrónico."); return }
    setLoadingRecuperar(true)
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(emailRecuperar.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoadingRecuperar(false)
    if (err) setErrorRecuperar(err.message)
    else setEnviado(true)
  }

  const panelIzquierdo = (
    <div className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0F172A 0%, #1E3A5F 60%, #0F172A 100%)" }}>
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      <div className="absolute -top-32 -right-32 rounded-full opacity-10"
        style={{ width: "500px", height: "500px", background: "radial-gradient(circle, #0369A1, transparent 70%)" }} />
      <div className="absolute -bottom-20 -left-20 rounded-full opacity-10"
        style={{ width: "400px", height: "400px", background: "radial-gradient(circle, #059669, transparent 70%)" }} />
      <div className="relative z-10 flex flex-col h-full p-12">
        <div className="w-fit rounded-xl bg-white px-5 py-3">
          <Image src="/logo_minserco.png?v=2" alt="Minserco" width={260} height={88}
            className="block object-contain" style={{ height: "80px", width: "auto" }}
            priority unoptimized />
        </div>
        <div className="mt-auto mb-10">
          <h1 className="text-4xl font-black leading-tight mb-4 text-white">
            Control total de<br />
            <span style={{ color: "#7DD3FC" }}>mantenimiento</span>{" "}
            y operaciones
          </h1>
        </div>
        <div className="space-y-3">
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-4 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "rgba(3,105,161,0.25)" }}>
                <Icon size={16} style={{ color: "#7DD3FC" }} />
              </div>
              <div>
                <div className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>{label}</div>
                <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            © 2025 Minserco SpA · Sistema interno · Acceso restringido
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-[#f1f5f9]">
      {panelIzquierdo}

      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12">

        {/* Logo mobile */}
        <div className="flex justify-center mb-8 lg:hidden">
          <Image src="/logo_minserco.png?v=2" alt="Minserco" width={180} height={60}
            className="object-contain" priority unoptimized />
        </div>

        <div className="w-full max-w-[380px]">

          {/* ── Vista Login ── */}
          {vista === "login" && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-black mb-1 text-gray-900">Bienvenido</h2>
                <p className="text-[13px] text-gray-500">Ingresa tus credenciales para acceder al sistema.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5 text-gray-600">Correo electrónico</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="usuario@minserco.cl" required autoComplete="email"
                      className="w-full pl-10 pr-4 h-11 rounded-lg text-[13px] bg-white border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ color: "#111827" }} />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold mb-1.5 text-gray-600">Contraseña</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input type={showPass ? "text" : "password"} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      required autoComplete="current-password"
                      className="w-full pl-10 pr-10 h-11 rounded-lg text-[13px] bg-white border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ color: "#111827" }} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* ¿Olvidó contraseña? */}
                <div className="flex justify-end">
                  <button type="button" onClick={() => { setVista("recuperar"); setError("") }}
                    className="text-[12px] font-medium hover:underline"
                    style={{ color: "#1a3673" }}>
                    ¿Olvidó su contraseña?
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                    <AlertCircle size={14} className="shrink-0" />{error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity mt-1"
                  style={{
                    background: loading ? "#93a8d4" : "#1a3673",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: loading ? "none" : "0 2px 8px rgba(26,54,115,0.3)",
                  }}>
                  {loading ? "Ingresando…" : "Ingresar al Sistema"}
                </button>
              </form>
            </>
          )}

          {/* ── Vista Recuperar contraseña ── */}
          {vista === "recuperar" && (
            <>
              <button onClick={() => { setVista("login"); setEnviado(false); setErrorRecuperar("") }}
                className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 hover:text-gray-800 mb-6 transition-colors">
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </button>

              {!enviado ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-black mb-1 text-gray-900">Recuperar contraseña</h2>
                    <p className="text-[13px] text-gray-500">
                      Ingresa tu correo registrado y te enviaremos un enlace para restablecer tu contraseña.
                    </p>
                  </div>

                  <form onSubmit={handleRecuperar} className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-semibold mb-1.5 text-gray-600">Correo electrónico</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input type="email" value={emailRecuperar} onChange={e => setEmailRecuperar(e.target.value)}
                          placeholder="usuario@minserco.cl" required autoComplete="email"
                          className="w-full pl-10 pr-4 h-11 rounded-lg text-[13px] bg-white border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          style={{ color: "#111827" }} />
                      </div>
                    </div>

                    {errorRecuperar && (
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                        <AlertCircle size={14} className="shrink-0" />{errorRecuperar}
                      </div>
                    )}

                    <button type="submit" disabled={loadingRecuperar}
                      className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity"
                      style={{
                        background: loadingRecuperar ? "#93a8d4" : "#1a3673",
                        cursor: loadingRecuperar ? "not-allowed" : "pointer",
                        boxShadow: loadingRecuperar ? "none" : "0 2px 8px rgba(26,54,115,0.3)",
                      }}>
                      {loadingRecuperar ? "Enviando…" : "Enviar enlace de recuperación"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex flex-col items-center text-center py-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(5,150,105,0.1)" }}>
                    <CheckCircle2 size={32} style={{ color: "#059669" }} />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 mb-2">Correo enviado</h2>
                  <p className="text-[13px] text-gray-500 mb-6">
                    Revisá tu bandeja de entrada en <strong>{emailRecuperar}</strong>. El enlace expira en 1 hora.
                  </p>
                  <button onClick={() => { setVista("login"); setEnviado(false) }}
                    className="text-[13px] font-semibold hover:underline" style={{ color: "#1a3673" }}>
                    Volver al inicio de sesión
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
