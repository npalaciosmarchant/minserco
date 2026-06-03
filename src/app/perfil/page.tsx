"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/components/ui/ToastProvider"
import {
  User, Shield, HardHat, Mail, Key, LogOut,
  CheckCircle2, Save, ArrowLeft,
} from "lucide-react"

export default function PerfilPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { success, error } = useToast()
  const [nombre, setNombre] = useState(user?.nombre ?? "")
  const [passActual, setPassActual] = useState("")
  const [passNueva, setPassNueva] = useState("")
  const [saving, setSaving] = useState(false)

  const esAdmin = user?.rol === "admin"

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      success("Perfil actualizado", "Los cambios fueron guardados correctamente.")
    }, 800)
  }

  function handleLogout() {
    logout()
    router.push("/login")
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6 page-enter">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg"
          style={{ color: "var(--ds-fg-muted)", background: "var(--ds-surface)", border: "1px solid var(--ds-border)", transition: "background 150ms" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--ds-muted)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--ds-surface)"}
        >
          <ArrowLeft size={13} /> Volver
        </button>
      </div>

      {/* Avatar card */}
      <div
        className="ds-card p-6 flex items-center gap-5"
        style={{ background: "linear-gradient(135deg, var(--ds-primary) 0%, var(--ds-secondary) 100%)", border: "none" }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
          style={{
            background: esAdmin ? "rgba(3,105,161,0.30)" : "rgba(124,58,237,0.30)",
            color: esAdmin ? "#7DD3FC" : "#C4B5FD",
            border: "2px solid " + (esAdmin ? "rgba(3,105,161,0.40)" : "rgba(124,58,237,0.40)"),
            fontFamily: "Fira Code, monospace",
          }}
        >
          {user.nombre.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-black text-white leading-tight">{user.nombre}</h1>
          <div className="flex items-center gap-2 mt-1">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
              style={{
                background: esAdmin ? "rgba(3,105,161,0.25)" : "rgba(124,58,237,0.25)",
                color: esAdmin ? "#7DD3FC" : "#C4B5FD",
                fontFamily: "Fira Code, monospace",
              }}
            >
              {esAdmin ? <Shield size={10} /> : <HardHat size={10} />}
              {esAdmin ? "ADMINISTRADOR" : "TÉCNICO"}
            </div>
          </div>
          <p className="text-[12px] mt-1.5" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Fira Code, monospace" }}>
            {user.email}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleGuardar} className="space-y-5">

        {/* Info personal */}
        <div className="ds-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--ds-muted)" }}>
              <User size={13} style={{ color: "var(--ds-fg-muted)" }} />
            </div>
            <h2 className="text-[14px] font-bold" style={{ color: "var(--ds-fg)" }}>Información personal</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--ds-fg-muted)" }}>
                Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{
                  background: "var(--ds-surface)",
                  border: "1px solid var(--ds-border)",
                  color: "var(--ds-fg)",
                  transition: "border-color 150ms, box-shadow 150ms",
                }}
                onFocus={e => {
                  e.target.style.borderColor = "var(--ds-accent)"
                  e.target.style.boxShadow = "0 0 0 3px rgba(3,105,161,0.12)"
                }}
                onBlur={e => {
                  e.target.style.borderColor = "var(--ds-border)"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--ds-fg-muted)" }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--ds-fg-subtle)" }} />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px]"
                  style={{
                    background: "var(--ds-muted)",
                    border: "1px solid var(--ds-border)",
                    color: "var(--ds-fg-subtle)",
                    cursor: "not-allowed",
                  }}
                />
              </div>
              <p className="text-[11px] mt-1" style={{ color: "var(--ds-fg-subtle)" }}>
                El email no puede modificarse. Contacta al administrador si necesitas cambiarlo.
              </p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--ds-fg-muted)" }}>
                Rol
              </label>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px]"
                style={{
                  background: "var(--ds-muted)",
                  border: "1px solid var(--ds-border)",
                  color: "var(--ds-fg-subtle)",
                }}
              >
                {esAdmin ? <Shield size={14} style={{ color: "var(--ds-accent)" }} /> : <HardHat size={14} style={{ color: "#7C3AED" }} />}
                {esAdmin ? "Administrador del sistema" : "Técnico de terreno"}
              </div>
            </div>
          </div>
        </div>

        {/* Cambio de contraseña */}
        <div className="ds-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--ds-muted)" }}>
              <Key size={13} style={{ color: "var(--ds-fg-muted)" }} />
            </div>
            <h2 className="text-[14px] font-bold" style={{ color: "var(--ds-fg)" }}>Cambiar contraseña</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--ds-fg-muted)" }}>
                Contraseña actual
              </label>
              <input
                type="password"
                value={passActual}
                onChange={e => setPassActual(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{
                  background: "var(--ds-surface)",
                  border: "1px solid var(--ds-border)",
                  color: "var(--ds-fg)",
                  transition: "border-color 150ms, box-shadow 150ms",
                }}
                onFocus={e => {
                  e.target.style.borderColor = "var(--ds-accent)"
                  e.target.style.boxShadow = "0 0 0 3px rgba(3,105,161,0.12)"
                }}
                onBlur={e => {
                  e.target.style.borderColor = "var(--ds-border)"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: "var(--ds-fg-muted)" }}>
                Nueva contraseña
              </label>
              <input
                type="password"
                value={passNueva}
                onChange={e => setPassNueva(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{
                  background: "var(--ds-surface)",
                  border: "1px solid var(--ds-border)",
                  color: "var(--ds-fg)",
                  transition: "border-color 150ms, box-shadow 150ms",
                }}
                onFocus={e => {
                  e.target.style.borderColor = "var(--ds-accent)"
                  e.target.style.boxShadow = "0 0 0 3px rgba(3,105,161,0.12)"
                }}
                onBlur={e => {
                  e.target.style.borderColor = "var(--ds-border)"
                  e.target.style.boxShadow = "none"
                }}
              />
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold"
            style={{
              background: "rgba(220,38,38,0.06)",
              border: "1px solid rgba(220,38,38,0.18)",
              color: "var(--ds-danger)",
              transition: "background 150ms",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.10)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.06)"}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-bold text-white"
            style={{
              background: saving ? "var(--ds-secondary)" : "var(--ds-accent)",
              boxShadow: saving ? "none" : "0 2px 8px rgba(3,105,161,0.25)",
              transition: "background 150ms",
            }}
          >
            {saving
              ? <><div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Guardando…</>
              : <><Save size={15} /> Guardar cambios</>
            }
          </button>
        </div>
      </form>

    </div>
  )
}
