"use client"

import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react"

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

export function mesActual(): string { return new Date().toISOString().slice(0, 7) }

function shift(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number)
  const d = new Date(y, (m - 1) + delta, 1)
  return d.toISOString().slice(0, 7)
}
function label(ym: string): string {
  const [y, m] = ym.split("-")
  return `${MESES[Number(m) - 1]} ${y}`
}

// Devuelve true si la fecha (YYYY-MM-DD) pertenece al mes seleccionado ("todos" = siempre).
export function enMes(fecha: string | undefined | null, value: string): boolean {
  if (value === "todos") return true
  if (!fecha) return false
  return fecha.slice(0, 7) === value
}

export function FiltroMes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const todos = value === "todos"
  const ym = todos ? mesActual() : value
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <div className="flex items-center rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <button className="px-2 py-1.5 transition-colors hover:bg-black/5 disabled:opacity-40" disabled={todos} onClick={() => onChange(shift(ym, -1))}><ChevronLeft size={15} /></button>
        <span className="px-3 py-1.5 text-sm font-medium text-center capitalize" style={{ minWidth: "8.5rem", color: todos ? "var(--muted-foreground)" : "var(--foreground)" }}>{todos ? "Todos los meses" : label(ym)}</span>
        <button className="px-2 py-1.5 transition-colors hover:bg-black/5 disabled:opacity-40" disabled={todos} onClick={() => onChange(shift(ym, 1))}><ChevronRight size={15} /></button>
      </div>
      <button onClick={() => onChange(todos ? mesActual() : "todos")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
        <CalendarRange size={13} />{todos ? "Ver por mes" : "Ver todos"}
      </button>
    </div>
  )
}
