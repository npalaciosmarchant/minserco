"use client"

import { useEffect, useState, useMemo } from "react"
import { mantenciones, ordenesTrabajo, contratos, asignaciones, tecnicos } from "@/lib/store"
import { Mantencion, OrdenTrabajo, ContratoArriendo, AsignacionTecnico, Tecnico } from "@/lib/types"
import { ChevronLeft, ChevronRight, Wrench, ClipboardList, KeyRound, CalendarDays } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

type EventoCalendario = {
  id: string
  fecha: string // YYYY-MM-DD
  tipo: "mantencion" | "orden" | "arriendo_vence" | "asignacion"
  titulo: string
  subtitulo?: string
  color: string
}

const COLORES = {
  mantencion: "#f59e0b",
  orden: "#60a5fa",
  arriendo_vence: "#f87171",
  asignacion: "#a78bfa",
}

const ICONOS = {
  mantencion: Wrench,
  orden: ClipboardList,
  arriendo_vence: KeyRound,
  asignacion: CalendarDays,
}

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function getDiaSemana(date: Date): number {
  // 0=Lun…6=Dom
  return (date.getDay() + 6) % 7
}

export default function CalendarioPage() {
  const hoy = new Date()
  const [año, setAño] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth()) // 0-indexed
  const [selectedDia, setSelectedDia] = useState<string | null>(null)

  const [ms, setMs] = useState<Mantencion[]>([])
  const [ots, setOts] = useState<OrdenTrabajo[]>([])
  const [cs, setCs] = useState<ContratoArriendo[]>([])
  const [asigs, setAsigs] = useState<AsignacionTecnico[]>([])
  const [tecs, setTecs] = useState<Tecnico[]>([])

  useEffect(() => {
    setMs(mantenciones.getAll())
    setOts(ordenesTrabajo.getAll())
    setCs(contratos.getAll())
    setAsigs(asignaciones.getAll())
    setTecs(tecnicos.getAll())
  }, [])

  const eventos = useMemo((): EventoCalendario[] => {
    const evs: EventoCalendario[] = []

    // Mantenciones: por fecha próxima mantencion
    ms.forEach(m => {
      if (m.proximaMantencion) {
        evs.push({
          id: `m-${m.id}`,
          fecha: m.proximaMantencion,
          tipo: "mantencion",
          titulo: m.equipo,
          subtitulo: `${m.tipo} — ${m.estado}`,
          color: COLORES.mantencion,
        })
      }
    })

    // OTs: por fecha programada o inicio
    ots.forEach(o => {
      const fecha = o.fechaInicio || o.creadoEn.slice(0, 10)
      evs.push({
        id: `ot-${o.id}`,
        fecha,
        tipo: "orden",
        titulo: o.numero,
        subtitulo: `${o.cliente} — ${o.tipo.replace(/_/g, " ")}`,
        color: COLORES.orden,
      })
    })

    // Contratos: fecha de vencimiento
    cs.forEach(c => {
      if (c.estado === "activo" || c.estado === "vencido") {
        evs.push({
          id: `arr-${c.id}`,
          fecha: c.fechaTermino,
          tipo: "arriendo_vence",
          titulo: `Vence: ${c.equipo}`,
          subtitulo: c.cliente,
          color: COLORES.arriendo_vence,
        })
      }
    })

    // Asignaciones de técnicos
    asigs.forEach(a => {
      const tec = tecs.find(t => t.id === a.tecnicoId)
      evs.push({
        id: `asig-${a.id}`,
        fecha: a.fecha,
        tipo: "asignacion",
        titulo: tec ? tec.nombre : "Técnico",
        subtitulo: a.descripcion || a.tipo,
        color: COLORES.asignacion,
      })
    })

    return evs
  }, [ms, ots, cs, asigs, tecs])

  // Build calendar grid for current month
  const { dias, primerDiaSemana, totalDias } = useMemo(() => {
    const primerDia = new Date(año, mes, 1)
    const primerDiaSemana = getDiaSemana(primerDia)
    const totalDias = new Date(año, mes + 1, 0).getDate()
    const dias: (number | null)[] = []
    for (let i = 0; i < primerDiaSemana; i++) dias.push(null)
    for (let d = 1; d <= totalDias; d++) dias.push(d)
    // pad to full weeks
    while (dias.length % 7 !== 0) dias.push(null)
    return { dias, primerDiaSemana, totalDias }
  }, [año, mes])

  function navMes(delta: number) {
    let m = mes + delta
    let a = año
    if (m < 0) { m = 11; a-- }
    if (m > 11) { m = 0; a++ }
    setMes(m)
    setAño(a)
    setSelectedDia(null)
  }

  function fechaStr(dia: number) {
    return `${año}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
  }

  function eventosDelDia(dia: number): EventoCalendario[] {
    const f = fechaStr(dia)
    return eventos.filter(e => e.fecha === f)
  }

  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`

  const eventosSeleccionados = selectedDia ? eventos.filter(e => e.fecha === selectedDia) : []

  return (
    <PageShell
      icon={CalendarDays}
      title="Calendario General"
      subtitle="Mantenciones, OTs, vencimientos y asignaciones"
      color="#60a5fa"
      actions={
        <div className="hidden md:flex items-center gap-4">
          {Object.entries(COLORES).map(([tipo, color]) => (
            <div key={tipo} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {tipo === "mantencion" ? "Mantención" : tipo === "orden" ? "OT" : tipo === "arriendo_vence" ? "Arriendo" : "Técnico"}
              </span>
            </div>
          ))}
        </div>
      }
    >
      <div className="space-y-5">

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Calendar */}
        <div className="lg:col-span-3 rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navMes(-1)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--muted-foreground)", background: "var(--accent)" }}>
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
              {MESES[mes]} {año}
            </h2>
            <button onClick={() => navMes(1)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--muted-foreground)", background: "var(--accent)" }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS.map(d => (
              <div key={d} className="text-center text-xs font-semibold py-1"
                style={{ color: "var(--muted-foreground)" }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {dias.map((dia, idx) => {
              if (dia === null) {
                return <div key={`empty-${idx}`} className="h-20 rounded-lg" style={{ background: "transparent" }} />
              }
              const f = fechaStr(dia)
              const evs = eventosDelDia(dia)
              const isHoy = f === hoyStr
              const isSelected = f === selectedDia
              return (
                <div
                  key={f}
                  onClick={() => setSelectedDia(isSelected ? null : f)}
                  className="h-20 rounded-lg p-1.5 cursor-pointer transition-all duration-150 flex flex-col"
                  style={{
                    background: isSelected ? "var(--primary)" : isHoy ? "oklch(0.28 0.05 85 / 0.4)" : "var(--accent)",
                    border: isHoy ? "1px solid var(--primary)" : "1px solid transparent",
                  }}>
                  <span className="text-xs font-bold leading-none mb-1"
                    style={{ color: isSelected ? "var(--primary-foreground)" : isHoy ? "var(--primary)" : "var(--foreground)" }}>
                    {dia}
                  </span>
                  <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                    {evs.slice(0, 3).map(ev => (
                      <div key={ev.id} className="flex items-center gap-1 rounded px-1"
                        style={{ background: ev.color + "22" }}>
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ev.color }} />
                        <span className="text-xs truncate leading-tight" style={{ color: isSelected ? "var(--primary-foreground)" : ev.color, fontSize: "9px" }}>
                          {ev.titulo}
                        </span>
                      </div>
                    ))}
                    {evs.length > 3 && (
                      <span className="text-xs" style={{ color: isSelected ? "var(--primary-foreground)" : "var(--muted-foreground)", fontSize: "9px" }}>
                        +{evs.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Side panel */}
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          {selectedDia ? (
            <>
              <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>
                {new Date(selectedDia + "T12:00:00").toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              {eventosSeleccionados.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Sin eventos este día</p>
              ) : (
                <div className="space-y-2 overflow-y-auto flex-1">
                  {eventosSeleccionados.map(ev => {
                    const Icon = ICONOS[ev.tipo]
                    return (
                      <div key={ev.id} className="rounded-lg p-3"
                        style={{ background: ev.color + "15", border: `1px solid ${ev.color}30` }}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={12} style={{ color: ev.color }} />
                          <span className="text-xs font-semibold" style={{ color: ev.color }}>
                            {ev.tipo === "mantencion" ? "Mantención" : ev.tipo === "orden" ? "Orden de Trabajo" : ev.tipo === "arriendo_vence" ? "Vence arriendo" : "Asignación"}
                          </span>
                        </div>
                        <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>{ev.titulo}</p>
                        {ev.subtitulo && <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{ev.subtitulo}</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Este mes</h3>
              <div className="space-y-2">
                {Object.entries(COLORES).map(([tipo, color]) => {
                  const count = eventos.filter(e => e.tipo === tipo && e.fecha.startsWith(`${año}-${String(mes + 1).padStart(2, "0")}`)).length
                  const Icon = ICONOS[tipo as keyof typeof ICONOS]
                  const label = tipo === "mantencion" ? "Mantenciones" : tipo === "orden" ? "Órdenes de Trabajo" : tipo === "arriendo_vence" ? "Arriendos vencen" : "Asignaciones"
                  return (
                    <div key={tipo} className="flex items-center gap-2 rounded-lg p-2"
                      style={{ background: color + "12" }}>
                      <Icon size={13} style={{ color }} />
                      <span className="text-xs flex-1" style={{ color: "var(--muted-foreground)" }}>{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>{count}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>
                Haz clic en un día para ver sus eventos
              </p>
            </>
          )}
        </div>
      </div>
      </div>
    </PageShell>
  )
}
