"use client"

import { useState, type ReactNode } from "react"
import { CalendarDays, List, ChevronLeft, ChevronRight } from "lucide-react"

export type EventoAgenda = { id: string; fecha?: string; titulo: string; color?: string }

export function AgendaVista<T extends EventoAgenda>({ items, onItemClick, renderCard, onDayClick, mesRef, onMesRefChange }: {
  items: T[]
  onItemClick: (item: T) => void
  renderCard: (item: T) => ReactNode
  onDayClick?: (fecha: string) => void
  mesRef?: string
  onMesRefChange?: (ym: string) => void
}) {
  const [vista, setVista] = useState<"lista" | "calendario">("lista")
  const [mesInterno, setMesInterno] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const mes = mesRef ? new Date(Number(mesRef.slice(0, 4)), Number(mesRef.slice(5, 7)) - 1, 1) : mesInterno
  const irMes = (nuevo: Date) => {
    if (mesRef && onMesRefChange) onMesRefChange(`${nuevo.getFullYear()}-${String(nuevo.getMonth() + 1).padStart(2, "0")}`)
    else setMesInterno(nuevo)
  }

  const toggle = (
    <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
      <button onClick={() => setVista("lista")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md font-medium" style={{ background: vista === "lista" ? "var(--card)" : "transparent", color: vista === "lista" ? "var(--foreground)" : "var(--muted-foreground)" }}><List size={13} />Lista</button>
      <button onClick={() => setVista("calendario")} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md font-medium" style={{ background: vista === "calendario" ? "var(--card)" : "transparent", color: vista === "calendario" ? "var(--foreground)" : "var(--muted-foreground)" }}><CalendarDays size={13} />Calendario</button>
    </div>
  )

  if (vista === "lista") {
    const ordenados = [...items].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""))
    return (
      <div className="space-y-3">
        <div className="flex justify-end">{toggle}</div>
        {ordenados.length === 0 && <div className="py-16 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Sin registros.</div>}
        <div className="space-y-2">{ordenados.map(it => <div key={it.id} onClick={() => onItemClick(it)} className="cursor-pointer">{renderCard(it)}</div>)}</div>
      </div>
    )
  }

  const y = mes.getFullYear(), m = mes.getMonth()
  const primer = new Date(y, m, 1).getDay()
  const dias = new Date(y, m + 1, 0).getDate()
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
  const celdas: (number | null)[] = []
  const offset = (primer + 6) % 7
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let d = 1; d <= dias; d++) celdas.push(d)
  const eventosDia = (d: number) => {
    const s = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    return items.filter(it => it.fecha === s)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => irMes(new Date(y, m - 1, 1))} className="p-1.5 rounded-lg" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}><ChevronLeft size={16} /></button>
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{meses[m]} {y}</span>
          <button onClick={() => irMes(new Date(y, m + 1, 1))} className="p-1.5 rounded-lg" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}><ChevronRight size={16} /></button>
        </div>
        {toggle}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium" style={{ color: "var(--muted-foreground)" }}>
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((d, i) => {
          const fechaCelda = d ? `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : ""
          return (
          <div key={i} onClick={() => { if (d && onDayClick) onDayClick(fechaCelda) }} className={"min-h-[68px] rounded-lg p-1 text-left" + (d && onDayClick ? " cursor-pointer transition-colors hover:brightness-110" : "")} style={{ background: d ? "var(--card)" : "transparent", border: d ? "1px solid var(--border)" : "none" }}>
            {d && (
              <>
                <div className="text-[11px] font-medium mb-0.5" style={{ color: "var(--muted-foreground)" }}>{d}</div>
                <div className="space-y-0.5">
                  {eventosDia(d).slice(0, 3).map(ev => (
                    <button key={ev.id} onClick={e => { e.stopPropagation(); onItemClick(ev) }} className="block w-full truncate text-left text-[10px] px-1 py-0.5 rounded" style={{ background: (ev.color || "#1a3673") + "22", color: ev.color || "#1a3673" }} title={ev.titulo}>{ev.titulo}</button>
                  ))}
                  {eventosDia(d).length > 3 && <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>+{eventosDia(d).length - 3}</div>}
                </div>
              </>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
