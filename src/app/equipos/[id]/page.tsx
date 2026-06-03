"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  mantenciones, reparaciones, ordenesTrabajo, informesEntrega,
  clientesEquipos, contratos, cotizaciones,
} from "@/lib/store"
import {
  Wrench, Settings, ClipboardList, ClipboardCheck, KeyRound,
  FileText, ArrowLeft, Calendar, User, MapPin, Shield,
  CheckCircle2, Clock, AlertCircle,
} from "lucide-react"
import Link from "next/link"

type EventoHistorial = {
  id: string
  fecha: string
  tipo: "mantencion" | "reparacion" | "ot" | "informe" | "arriendo" | "cotizacion"
  titulo: string
  subtitulo: string
  estado: string
  color: string
  Icon: React.ElementType
  href: string
}

const TIPO_META: Record<EventoHistorial["tipo"], { color: string; bg: string; Icon: React.ElementType; label: string }> = {
  mantencion:  { color: "#D97706", bg: "#FEF3C7", Icon: Wrench,         label: "Mantención" },
  reparacion:  { color: "#0369A1", bg: "#DBEAFE", Icon: Settings,        label: "Reparación" },
  ot:          { color: "#6366F1", bg: "#EEF2FF", Icon: ClipboardList,   label: "Orden de Trabajo" },
  informe:     { color: "#059669", bg: "#D1FAE5", Icon: ClipboardCheck,  label: "Informe Entrega" },
  arriendo:    { color: "#7C3AED", bg: "#EDE9FE", Icon: KeyRound,        label: "Arriendo" },
  cotizacion:  { color: "#0891B2", bg: "#ECFEFF", Icon: FileText,        label: "Cotización" },
}

function fFecha(s: string) {
  try { return new Date(s).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) }
  catch { return s }
}

function normalize(s: string) { return s.toLowerCase().replace(/[\s\-_.]+/g, "") }

export default function EquipoHistorialPage() {
  const params = useParams()
  const router = useRouter()
  const query = decodeURIComponent((params?.id as string) ?? "")

  const [eventos, setEventos] = useState<EventoHistorial[]>([])
  const [equipoInfo, setEquipoInfo] = useState<{
    nombre: string; empresa?: string; ciudad?: string; tecnico?: string
    garantiaHasta?: string; ultimaMantencion?: string; proximaMantencion?: string
    numeroSerie?: string; codigoEquipo?: string
  } | null>(null)

  useEffect(() => {
    if (!query) return
    const q = normalize(query)

    const evs: EventoHistorial[] = []

    // Mantenciones
    mantenciones.getAll().filter(m =>
      normalize(m.equipo).includes(q) || normalize(m.numeroSerie ?? "").includes(q)
    ).forEach(m => evs.push({
      id: "m" + m.id, fecha: m.fecha || m.creadoEn, tipo: "mantencion",
      titulo: m.equipo, subtitulo: m.tecnico + " · " + m.tipo,
      estado: m.estado, color: TIPO_META.mantencion.color,
      Icon: TIPO_META.mantencion.Icon, href: "/mantencion",
    }))

    // Reparaciones
    reparaciones.getAll().filter(r =>
      normalize(r.equipo).includes(q) || normalize(r.numeroSerie ?? "").includes(q) || normalize(r.cliente).includes(q)
    ).forEach(r => evs.push({
      id: "r" + r.id, fecha: r.fechaRecepcion || r.creadoEn, tipo: "reparacion",
      titulo: r.equipo, subtitulo: r.cliente + " · " + r.falla.slice(0, 50),
      estado: r.estado, color: TIPO_META.reparacion.color,
      Icon: TIPO_META.reparacion.Icon, href: "/reparacion",
    }))

    // OTs
    ordenesTrabajo.getAll().filter(o =>
      normalize(o.equipo ?? "").includes(q) || normalize(o.cliente).includes(q)
    ).forEach(o => evs.push({
      id: "ot" + o.id, fecha: o.fechaProgramada || o.creadoEn, tipo: "ot",
      titulo: o.numero + " — " + o.cliente, subtitulo: o.tecnico + " · " + o.descripcion.slice(0, 50),
      estado: o.estado, color: TIPO_META.ot.color,
      Icon: TIPO_META.ot.Icon, href: "/ordenes",
    }))

    // Informes de entrega
    informesEntrega.getAll().filter(i =>
      normalize(i.equipo).includes(q) || normalize(i.cliente).includes(q) || normalize(i.numeroSerie ?? "").includes(q)
    ).forEach(i => evs.push({
      id: "ie" + i.id, fecha: i.fechaEntrega || i.creadoEn, tipo: "informe",
      titulo: i.numero + " — " + i.equipo, subtitulo: i.cliente + " · " + i.tecnico,
      estado: i.estado, color: TIPO_META.informe.color,
      Icon: TIPO_META.informe.Icon, href: "/informes-entrega",
    }))

    // Arriendos
    contratos.getAll().filter(c =>
      normalize(c.equipo).includes(q) || normalize(c.cliente).includes(q)
    ).forEach(c => evs.push({
      id: "c" + c.id, fecha: c.fechaInicio || c.creadoEn, tipo: "arriendo",
      titulo: c.equipo, subtitulo: c.cliente + " · " + c.fechaInicio + " → " + c.fechaTermino,
      estado: c.estado, color: TIPO_META.arriendo.color,
      Icon: TIPO_META.arriendo.Icon, href: "/arriendo",
    }))

    // Cotizaciones
    cotizaciones.getAll().filter(c =>
      normalize(c.descripcion).includes(q) || normalize(c.cliente).includes(q)
    ).forEach(c => evs.push({
      id: "cot" + c.id, fecha: c.fechaEmision || c.creadoEn, tipo: "cotizacion",
      titulo: c.numero + " — " + c.cliente, subtitulo: c.descripcion.slice(0, 60),
      estado: c.estado, color: TIPO_META.cotizacion.color,
      Icon: TIPO_META.cotizacion.Icon, href: "/cotizaciones",
    }))

    evs.sort((a, b) => b.fecha.localeCompare(a.fecha))
    setEventos(evs)

    // Buscar info del equipo en clientesEquipos
    const ce = clientesEquipos.getAll().find(e =>
      normalize(e.equipo).includes(q) || normalize(e.codigoEquipo ?? "").includes(q)
    )
    if (ce) {
      setEquipoInfo({
        nombre: ce.equipo, empresa: ce.empresa, ciudad: ce.ciudad,
        tecnico: ce.tecnicoResponsable, garantiaHasta: ce.garantiaHasta,
        ultimaMantencion: ce.ultimaMantencion, proximaMantencion: ce.proximaMantencion,
        numeroSerie: ce.numeroSerie, codigoEquipo: ce.codigoEquipo,
      })
    }
  }, [query])

  const conteos = Object.keys(TIPO_META).reduce((acc, k) => {
    acc[k as EventoHistorial["tipo"]] = eventos.filter(e => e.tipo === k).length
    return acc
  }, {} as Record<EventoHistorial["tipo"], number>)

  return (
    <div className="px-6 pb-8 pt-6 max-w-[1000px] mx-auto space-y-5">

      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[13px] mb-1 hover:opacity-70 transition-opacity"
        style={{ color: "var(--ds-fg-subtle)" }}
      >
        <ArrowLeft size={14} /> Volver
      </button>

      {/* Header */}
      <div className="ds-card p-6" style={{ background: "linear-gradient(135deg, #0e1a35 0%, #1a2f5a 100%)", border: "none" }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.40)", fontFamily: "Fira Code, monospace" }}>
              Historial del equipo
            </p>
            <h1 className="text-2xl font-bold text-white leading-tight">{query}</h1>
            {equipoInfo && (
              <div className="flex flex-wrap gap-3 mt-2">
                {equipoInfo.empresa && (
                  <span className="flex items-center gap-1 text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                    <User size={11} /> {equipoInfo.empresa}
                  </span>
                )}
                {equipoInfo.ciudad && (
                  <span className="flex items-center gap-1 text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                    <MapPin size={11} /> {equipoInfo.ciudad}
                  </span>
                )}
                {equipoInfo.codigoEquipo && (
                  <span className="flex items-center gap-1 text-[12px]" style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Fira Code, monospace" }}>
                    #{equipoInfo.codigoEquipo}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-3xl font-black text-white" style={{ fontFamily: "Fira Code, monospace" }}>{eventos.length}</div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>registros totales</div>
          </div>
        </div>

        {/* Info equipo */}
        {equipoInfo && (equipoInfo.garantiaHasta || equipoInfo.proximaMantencion) && (
          <div className="flex flex-wrap gap-3 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
            {equipoInfo.garantiaHasta && (
              <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                <Shield size={12} />
                <span>Garantía hasta: <strong>{fFecha(equipoInfo.garantiaHasta)}</strong></span>
              </div>
            )}
            {equipoInfo.proximaMantencion && (
              <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                <Calendar size={12} />
                <span>Próxima mantención: <strong>{fFecha(equipoInfo.proximaMantencion)}</strong></span>
              </div>
            )}
            {equipoInfo.tecnico && (
              <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                <User size={12} />
                <span>Técnico: <strong>{equipoInfo.tecnico}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conteos por tipo */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {(Object.entries(TIPO_META) as [EventoHistorial["tipo"], typeof TIPO_META[keyof typeof TIPO_META]][]).map(([tipo, meta]) => (
          <div key={tipo} className="ds-card p-3 text-center" style={{ opacity: conteos[tipo] === 0 ? 0.4 : 1 }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5" style={{ background: meta.bg }}>
              <meta.Icon size={13} style={{ color: meta.color }} />
            </div>
            <div className="text-xl font-black" style={{ color: meta.color, fontFamily: "Fira Code, monospace" }}>{conteos[tipo]}</div>
            <div className="text-[10px]" style={{ color: "var(--ds-fg-subtle)" }}>{meta.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      {eventos.length === 0 ? (
        <div className="ds-card p-12 text-center">
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: "var(--ds-fg-subtle)", opacity: 0.3 }} />
          <p className="text-[14px] font-medium" style={{ color: "var(--ds-fg-subtle)" }}>No se encontraron registros para "{query}"</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--ds-fg-subtle)" }}>
            Intenta buscar por número de serie, nombre de equipo o empresa cliente.
          </p>
        </div>
      ) : (
        <div className="ds-card overflow-hidden">
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--ds-border)" }}>
            <span className="text-[12px] font-semibold" style={{ color: "var(--ds-fg)" }}>
              Línea de tiempo — {eventos.length} evento{eventos.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="relative">
            {/* Línea vertical */}
            <div
              className="absolute top-0 bottom-0 w-px"
              style={{ left: "44px", background: "var(--ds-border)" }}
            />
            {eventos.map((ev, i) => {
              const meta = TIPO_META[ev.tipo]
              const isLast = i === eventos.length - 1
              return (
                <Link key={ev.id} href={ev.href}>
                  <div
                    className="flex items-start gap-4 px-5 py-4 group"
                    style={{
                      borderBottom: !isLast ? "1px solid var(--ds-border)" : "none",
                      transition: "background 150ms",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--ds-muted)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    {/* Dot */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 relative z-10"
                      style={{ background: meta.bg, border: `2px solid ${meta.color}40` }}
                    >
                      <meta.Icon size={12} style={{ color: meta.color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                          style={{ background: meta.bg, color: meta.color, fontFamily: "Fira Code, monospace" }}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[13px] font-semibold truncate" style={{ color: "var(--ds-fg)" }}>
                          {ev.titulo}
                        </span>
                      </div>
                      <div className="text-[12px] mt-0.5 truncate" style={{ color: "var(--ds-fg-subtle)" }}>
                        {ev.subtitulo}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[11px]" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
                        {fFecha(ev.fecha)}
                      </div>
                      <div
                        className="text-[10px] mt-0.5 font-medium"
                        style={{ color: ev.estado === "completado" || ev.estado === "entregado" || ev.estado === "emitido" ? "#059669" : "var(--ds-fg-subtle)" }}
                      >
                        {ev.estado}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
