"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AuthProvider, useAuth, canAccess } from "@/lib/auth"
import Topbar from "./Topbar"
import { ToastProvider } from "@/components/ui/ToastProvider"
import NavDrawer from "./NavDrawer"
import { getSupabase } from "@/lib/supabase"
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react"

function CambiarPasswordModal({ onDone }: { onDone: () => void }) {
  const [nueva, setNueva] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [showA, setShowA] = useState(false)
  const [showB, setShowB] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (nueva.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return }
    if (nueva !== confirmar) { setError("Las contraseñas no coinciden."); return }
    setLoading(true)
    const sb = getSupabase()
    const { error: err } = await sb.auth.updateUser({ password: nueva })
    if (err) { setError(err.message); setLoading(false); return }
    // Marcar debe_cambiar_password = false en la tabla usuarios
    const { data: { user } } = await sb.auth.getUser()
    if (user) {
      await sb.from("usuarios").update({ debe_cambiar_password: false }).eq("id", user.id)
    }
    setLoading(false)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm mx-4 rounded-2xl p-8 shadow-2xl"
        style={{ background: "white" }}>
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "rgba(26,54,115,0.1)" }}>
            <ShieldCheck size={28} style={{ color: "#1a3673" }} />
          </div>
          <h2 className="text-xl font-black text-gray-900">Configura tu contraseña</h2>
          <p className="text-[13px] text-gray-500 text-center mt-1">
            Es tu primer acceso. Elige una contraseña segura para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold mb-1.5 text-gray-600">Nueva contraseña</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showA ? "text" : "password"}
                value={nueva}
                onChange={e => setNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full pl-9 pr-10 h-11 rounded-lg text-[13px] border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                style={{ color: "#111827" }}
              />
              <button type="button" onClick={() => setShowA(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showA ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold mb-1.5 text-gray-600">Confirmar contraseña</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showB ? "text" : "password"}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repite la contraseña"
                required
                className="w-full pl-9 pr-10 h-11 rounded-lg text-[13px] border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                style={{ color: "#111827" }}
              />
              <button type="button" onClick={() => setShowB(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showB ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-[12px] px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity"
            style={{
              background: loading ? "#93a8d4" : "#1a3673",
              cursor: loading ? "not-allowed" : "pointer",
            }}>
            {loading ? "Guardando…" : "Establecer contraseña"}
          </button>
        </form>
      </div>
    </div>
  )
}

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [passwordCambiado, setPasswordCambiado] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setDrawerOpen(v => !v), [])

  useEffect(() => {
    if (loading) return
    if (!user) {
      if (pathname !== "/login" && pathname !== "/reset-password") router.push("/login")
      return
    }
    if (pathname === "/login") { router.push("/"); return }
    if (!canAccess(user, pathname)) router.push("/mantencion")
  }, [user, loading, pathname])

  useEffect(() => { setDrawerOpen(false) }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0e1a35]">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-amber-400"
              style={{ animation: "pulse 1.4s cubic-bezier(0.16,1,0.3,1) infinite", animationDelay: i * 0.18 + "s" }} />
          ))}
        </div>
        <p className="text-[13px] text-white/40 tracking-wider uppercase">Cargando sistema</p>
      </div>
    )
  }

  if (!user || pathname === "/login" || pathname === "/reset-password") return <>{children}</>

  const debeCambiar = user.debeChangiarPassword && !passwordCambiado

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
      <Topbar onMenuToggle={toggleDrawer} menuOpen={drawerOpen} />
      <NavDrawer open={drawerOpen} onClose={closeDrawer} />
      <main className="flex-1 overflow-auto" style={{ paddingTop: "60px" }}>
        <div key={pathname} className="page-enter min-h-full">
          {children}
        </div>
      </main>
      {debeCambiar && <CambiarPasswordModal onDone={() => setPasswordCambiado(true)} />}
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Guard>{children}</Guard>
      </ToastProvider>
    </AuthProvider>
  )
}
