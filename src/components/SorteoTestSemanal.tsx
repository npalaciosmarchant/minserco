"use client"

import { useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { FlaskConical } from "lucide-react"

interface Seleccionado { id: string; nombre: string }

function pad(n: number) { return String(n).padStart(2, "0") }

// Lunes de la semana actual (hora local), formato YYYY-MM-DD.
function lunesDeEstaSemana(): string {
  const hoy = new Date()
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Número de semana ISO (lunes a domingo; la semana 1 es la que contiene el primer jueves del año).
function numeroSemana(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  const f = new Date(Date.UTC(y, m - 1, d))
  f.setUTCDate(f.getUTCDate() + 4 - (f.getUTCDay() || 7))
  const inicio = new Date(Date.UTC(f.getUTCFullYear(), 0, 1))
  return Math.ceil(((f.getTime() - inicio.getTime()) / 86400000 + 1) / 7)
}

export function SorteoTestSemanal() {
  const [semana] = useState(lunesDeEstaSemana)
  const [seleccionados, setSeleccionados] = useState<Seleccionado[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      const sb = getSupabase()
      try {
        // El sorteo (1 persona al azar, sin Sergio, Nicolas, Andrea ni Dylan) lo
        // hace la base de datos cada lunes de madrugada, sin depender de quién
        // abra la app. Si por algún motivo aún no existe el de esta semana, la
        // función lo genera en ese momento (siempre al azar, y una sola vez).
        const existente = await sb.from("sorteo_test_semanal").select("seleccionados").eq("semana", semana).maybeSingle()
        if (existente.error) throw existente.error
        if (existente.data) {
          if (!cancelado) setSeleccionados(existente.data.seleccionados as Seleccionado[])
          return
        }
        const { data, error: errRpc } = await sb.rpc("sortear_test_semanal")
        if (errRpc) throw errRpc
        if (!cancelado) setSeleccionados((data as Seleccionado[] | null) ?? [])
      } catch (e) {
        console.error("Error en sorteo semanal de test de alcohol y drogas:", e)
        if (!cancelado) setError(true)
      }
    }
    cargar()
    return () => { cancelado = true }
  }, [semana])

  return (
    <div className="ds-card p-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EDE9FE" }}>
          <FlaskConical size={20} style={{ color: "#7C3AED" }} />
        </div>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>
            Test de alcohol y drogas · semana {numeroSemana(semana)}
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--ds-fg-subtle)" }}>
            Sorteo aleatorio de 1 persona, se renueva cada lunes
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {error && <span className="text-[12px]" style={{ color: "var(--ds-danger)" }}>No se pudo cargar el sorteo</span>}
        {!error && seleccionados === null && <span className="text-[12px]" style={{ color: "var(--ds-fg-subtle)" }}>Cargando…</span>}
        {!error && seleccionados?.length === 0 && <span className="text-[12px]" style={{ color: "var(--ds-fg-subtle)" }}>Sin personal elegible</span>}
        {seleccionados?.map(s => (
          <span key={s.id} className="text-[13px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#EDE9FE", color: "#5B21B6" }}>
            {s.nombre}
          </span>
        ))}
      </div>
    </div>
  )
}
