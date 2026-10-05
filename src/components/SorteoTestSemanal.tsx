"use client"

import { useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase"
import { FlaskConical } from "lucide-react"

// Cuántas personas se sortean cada semana para el test de alcohol y drogas.
const CANTIDAD_SORTEADOS = 2

// Personas que NO participan del sorteo (se comparan por primer nombre, sin
// tildes ni mayúsculas, para tolerar diferencias de escritura en "usuarios").
const EXCLUIDOS = ["sergio", "nicolas", "andrea", "dylan"]

interface Seleccionado { id: string; nombre: string }

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
const primerNombre = (n: string) => sinTildes(n).split(/\s+/)[0] ?? ""

function pad(n: number) { return String(n).padStart(2, "0") }

// Lunes de la semana actual (hora local), formato YYYY-MM-DD. Es la "clave" del
// sorteo: mientras no cambie de lunes, el resultado se mantiene igual para todos.
function lunesDeEstaSemana(): string {
  const hoy = new Date()
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function mezclar<T>(arr: T[]): T[] {
  const a = arr.slice()
  const buf = new Uint32Array(a.length)
  crypto.getRandomValues(buf)
  for (let i = a.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function fechaLarga(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-CL", { day: "numeric", month: "long" })
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
        // 1) ¿Ya se sorteó esta semana? Entonces solo se muestra el resultado.
        const existente = await sb.from("sorteo_test_semanal").select("seleccionados").eq("semana", semana).maybeSingle()
        if (existente.error) throw existente.error
        if (existente.data) {
          if (!cancelado) setSeleccionados(existente.data.seleccionados as Seleccionado[])
          return
        }

        // 2) Si no, se sortea entre los usuarios activos, sin los excluidos.
        const { data: usuarios, error: errU } = await sb.from("usuarios").select("id, nombre, activo")
        if (errU) throw errU
        const elegibles: Seleccionado[] = (usuarios ?? [])
          .filter(u => u.activo !== false && u.nombre && !EXCLUIDOS.includes(primerNombre(u.nombre)))
          .map(u => ({ id: u.id as string, nombre: u.nombre as string }))
        const sorteados = mezclar(elegibles).slice(0, CANTIDAD_SORTEADOS)

        // 3) Se guarda; si otra persona sorteó al mismo tiempo, gana el primero
        // (ignoreDuplicates) y se vuelve a leer para mostrar el resultado oficial.
        const ins = await sb.from("sorteo_test_semanal")
          .upsert({ semana, seleccionados: sorteados }, { onConflict: "semana", ignoreDuplicates: true })
        if (ins.error) throw ins.error
        const final = await sb.from("sorteo_test_semanal").select("seleccionados").eq("semana", semana).maybeSingle()
        if (final.error) throw final.error
        if (!cancelado) setSeleccionados((final.data?.seleccionados as Seleccionado[] | undefined) ?? sorteados)
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
            Test de alcohol y drogas · semana del {fechaLarga(semana)}
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: "var(--ds-fg-subtle)" }}>
            Sorteo aleatorio que se renueva cada lunes
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
