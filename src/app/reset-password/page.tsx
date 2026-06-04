"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabase } from "@/lib/supabase"
import Image from "next/image"
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [nueva, setNueva] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [showA, setShowA] = useState(false)
  const [showB, setShowB] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [sesionLista, setSesionLista] = useState(false)

  useEffect(() => {
    // Supabase redirige con #access_token en la URL — el SDK lo procesa automáticamente
    const sb = getSupabase()
    sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSesionLista(true)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (nueva.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return }
    if (nueva !== confirmar) { setError("Las contraseñas no coinciden."); return }
    setLoading(true)
    const { error: err } = await getSupabase().auth.updateUser({ password: nueva })
    setLoading(false)
    if (err) { setError(err.message); return }
    setExito(true)
    setTimeout(() => router.push("/login"), 3000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9] p-6">
      <div className="w-full max-w-[380px]">
        <div className="flex justify-center mb-8">
          <Image src="/logo_minserco.png?v=2" alt="Minserco" width={180} height={60}
            className="object-contain" priority unoptimized />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {exito ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(5,150,105,0.1)" }}>
                <CheckCircle2 size={32} style={{ color: "#059669" }} />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">¡Contraseña actualizada!</h2>
              <p className="text-[13px] text-gray-500">
                Redirigiendo al inicio de sesión…
              </p>
            </div>
          ) : !sesionLista ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="flex gap-1.5 mb-3">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-blue-400"
                    style={{ animation: "pulse 1.4s cubic-bezier(0.16,1,0.3,1) infinite", animationDelay: i * 0.18 + "s" }} />
                ))}
              </div>
              <p className="text-[13px] text-gray-500">Verificando enlace…</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-black text-gray-900 mb-1">Nueva contraseña</h2>
                <p className="text-[13px] text-gray-500">Elige una contraseña segura para tu cuenta.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-semibold mb-1.5 text-gray-600">Nueva contraseña</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type={showA ? "text" : "password"} value={nueva}
                      onChange={e => setNueva(e.target.value)} placeholder="Mínimo 6 caracteres" required
                      className="w-full pl-9 pr-10 h-11 rounded-lg text-[13px] border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ color: "#111827" }} />
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
                    <input type={showB ? "text" : "password"} value={confirmar}
                      onChange={e => setConfirmar(e.target.value)} placeholder="Repite la contraseña" required
                      className="w-full pl-9 pr-10 h-11 rounded-lg text-[13px] border border-gray-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ color: "#111827" }} />
                    <button type="button" onClick={() => setShowB(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showB ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                    <AlertCircle size={14} className="shrink-0" />{error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full h-11 rounded-lg text-sm font-semibold text-white transition-opacity"
                  style={{
                    background: loading ? "#93a8d4" : "#1a3673",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: loading ? "none" : "0 2px 8px rgba(26,54,115,0.3)",
                  }}>
                  {loading ? "Guardando…" : "Guardar nueva contraseña"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
