"use client" // Los error boundaries de Next.js deben ser Client Components

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react"

// Boundary de error para /equipos/[id] (historial completo de un equipo).
// Antes, cualquier error inesperado al armar el historial (por ejemplo un
// registro con un campo vacío en otra parte del sistema) dejaba la pantalla
// en blanco con "This page couldn't load". Ahora se muestra un mensaje claro
// con la opción de reintentar o volver, en vez de una pantalla rota.
export default function ErrorHistorialEquipo({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error("Error al cargar el historial del equipo:", error)
  }, [error])

  return (
    <div className="px-6 pb-8 pt-6 max-w-[600px] mx-auto">
      <div className="ds-card p-8 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#FEF3C7" }}>
          <AlertTriangle size={22} style={{ color: "#D97706" }} />
        </div>
        <h2 className="text-base font-bold mb-1" style={{ color: "var(--ds-fg)" }}>
          No se pudo cargar el historial
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--ds-fg-subtle)" }}>
          Ocurrió un problema al reunir los registros de este equipo. Puedes intentar de nuevo o volver atrás.
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg"
            style={{ color: "var(--ds-fg-subtle)", background: "var(--ds-muted)" }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <button
            onClick={() => unstable_retry()}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-white"
            style={{ background: "#0369A1" }}
          >
            <RotateCcw size={14} /> Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}
