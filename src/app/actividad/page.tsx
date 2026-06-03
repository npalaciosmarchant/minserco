"use client"

import { useEffect, useState } from "react"
import { mantenciones, proyectos, reparaciones, importaciones, contratos, movimientos } from "@/lib/store"
import { Mantencion, Proyecto, Reparacion, Importacion, ContratoArriendo, MovimientoBodega } from "@/lib/types"
import { Wrench, Factory, Settings, Ship, KeyRound, Package, Activity } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

type Evento = {
  id: string
  modulo: string
  titulo: string
  subtitulo: string
  estado: string
  fecha: string
  color: string
  icon: React.ReactNode
}

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "mantencion", label: "Mantención" },
  { key: "fabricacion", label: "Fabricación" },
  { key: "reparacion", label: "Reparación" },
  { key: "bodega", label: "Bodega" },
  { key: "importacion", label: "Importación" },
  { key: "arriendo", label: "Arriendo" },
]

function formatFecha(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })
  } catch { return iso }
}

function buildEventos(
  ms: Mantencion[], ps: Proyecto[], rs: Reparacion[],
  imps: Importacion[], cs: ContratoArriendo[], movs: MovimientoBodega[]
): Evento[] {
  return [
    ...ms.map(m => ({
      id: m.id, modulo: "mantencion",
      titulo: m.equipo, subtitulo: `Mantención ${m.tipo} · Técnico: ${m.tecnico}`,
      estado: m.estado === "completado" ? "Completado" : m.estado === "en_proceso" ? "En proceso" : "Pendiente",
      fecha: m.creadoEn, color: "#f59e0b", icon: <Wrench size={14} />,
    })),
    ...ps.map(p => ({
      id: p.id, modulo: "fabricacion",
      titulo: p.nombre, subtitulo: `Cliente: ${p.cliente} · Responsable: ${p.responsable}`,
      estado: p.estado.replace(/_/g, " "),
      fecha: p.creadoEn, color: "#7c3aed", icon: <Factory size={14} />,
    })),
    ...rs.map(r => ({
      id: r.id, modulo: "reparacion",
      titulo: r.equipo, subtitulo: `Cliente: ${r.cliente} · Técnico: ${r.tecnico}`,
      estado: r.estado.replace(/_/g, " "),
      fecha: r.creadoEn, color: "#fb923c", icon: <Settings size={14} />,
    })),
    ...movs.map(m => ({
      id: m.id, modulo: "bodega",
      titulo: m.nombreItem ?? "(Producto eliminado)",
      subtitulo: `${m.tipo === "entrada" ? "Entrada" : "Salida"} · ${m.motivo} · ${m.responsable}`,
      estado: m.tipo === "entrada" ? `+${m.cantidad}` : `-${m.cantidad}`,
      fecha: m.creadoEn, color: "#059669", icon: <Package size={14} />,
    })),
    ...imps.map(i => ({
      id: i.id, modulo: "importacion",
      titulo: i.descripcion.slice(0, 50), subtitulo: `${i.proveedor} · ${i.paisOrigen}`,
      estado: i.estado.replace(/_/g, " "),
      fecha: i.creadoEn, color: "#22d3ee", icon: <Ship size={14} />,
    })),
    ...cs.map(c => ({
      id: c.id, modulo: "arriendo",
      titulo: c.equipo, subtitulo: `Cliente: ${c.cliente} · Término: ${c.fechaTermino}`,
      estado: c.estado,
      fecha: c.creadoEn, color: "#fbbf24", icon: <KeyRound size={14} />,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha))
}

export default function ActividadPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [filtro, setFiltro] = useState("todos")

  useEffect(() => {
    const ev = buildEventos(
      mantenciones.getAll(),
      proyectos.getAll(),
      reparaciones.getAll(),
      importaciones.getAll(),
      contratos.getAll(),
      movimientos.getAll(),
    )
    setEventos(ev)
  }, [])

  const filtrados = filtro === "todos" ? eventos : eventos.filter(e => e.modulo === filtro)

  return (
    <PageShell
      icon={Activity}
      title="Historial de Actividad"
      subtitle={`Todos los registros del sistema · ${filtrados.length} eventos`}
      color="#2dd4bf"
    >
      {/* Filtros */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {FILTROS.map(f => (
          <button key={f.key} className={`filter-pill${filtro === f.key ? " active" : ""}`} onClick={() => setFiltro(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtrados.length === 0 ? (
        <div className="py-20 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          No hay actividad registrada en este módulo.
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />
          <div className="space-y-1">
            {filtrados.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 py-1.5 group">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 relative transition-transform group-hover:scale-110"
                  style={{ background: ev.color + "20", border: `1px solid ${ev.color}40`, color: ev.color }}
                >
                  {ev.icon}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{ev.titulo}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 capitalize"
                      style={{ background: ev.color + "20", color: ev.color }}
                    >
                      {ev.estado}
                    </span>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {ev.subtitulo} · {formatFecha(ev.fecha)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  )
}
