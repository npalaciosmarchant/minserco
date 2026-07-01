"use client"

import { useEffect, useState } from "react"
import {
  mantenciones, proyectos, reparaciones, bodega, importaciones,
  contratos, cotizaciones, ordenesTrabajo,
} from "@/lib/store"
import {
  Mantencion, Proyecto, Reparacion, ItemBodega, Importacion,
  ContratoArriendo, Cotizacion, OrdenTrabajo,
} from "@/lib/types"
import {
  Wrench, Settings, Package, AlertTriangle, ArrowRight,
  KeyRound, FileText, ClipboardList, Clock, TrendingUp,
  CheckCircle2, AlertCircle, Activity,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { StorageMeter } from "@/components/StorageMeter"

/* ── Bar Chart SVG ── */
function BarChartSVG({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const W = 260, H = 120, pad = 28, barW = Math.min(36, Math.floor((W - pad * 2) / data.length - 8))
  const gap = data.length > 0 ? (W - pad * 2 - barW * data.length) / Math.max(data.length - 1, 1) : 0
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const barH = Math.max(4, Math.round(((H - pad - 14) * d.value) / max))
        const x = pad + i * (barW + gap)
        const y = H - pad - barH
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} opacity={0.85} />
            <text x={x + barW / 2} y={H - pad + 11} textAnchor="middle" fontSize={9} fill="var(--ds-fg-subtle)">{d.label}</text>
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={10} fontWeight="700" fill={d.color}
                style={{ fontFamily: "Fira Code, monospace" }}>{d.value}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ── Pie Chart SVG ── */
function PieChartSVG({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return null
  const cx = 55, cy = 55, r = 40, ri = 22
  let angle = -Math.PI / 2
  const slices = data.filter(d => d.value > 0).map(d => {
    const sweep = (d.value / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    angle += sweep
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle)
    const xi1 = cx + ri * Math.cos(angle - sweep), yi1 = cy + ri * Math.sin(angle - sweep)
    const xi2 = cx + ri * Math.cos(angle), yi2 = cy + ri * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return { ...d, path: `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${ri},${ri} 0 ${large},0 ${xi1},${yi1} Z` }
  })
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 110 110" style={{ width: 110, height: 110, flexShrink: 0 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} opacity={0.9} />)}
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} fontWeight="800" fill="var(--ds-fg)"
          style={{ fontFamily: "Fira Code, monospace" }}>{total}</text>
      </svg>
      <div className="flex-1 space-y-2">
        {slices.map(d => (
          <div key={d.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span className="text-[12px]" style={{ color: "var(--ds-fg-muted)" }}>{d.label}</span>
            </div>
            <span className="text-[12px] font-bold" style={{ color: d.color, fontFamily: "Fira Code, monospace" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Gauge ── */
function GaugeSVG({ pct, color }: { pct: number; color: string }) {
  const p = Math.max(0, Math.min(100, pct))
  const angle = (p / 100) * Math.PI
  const x2 = (50 - 35 * Math.cos(angle)).toFixed(1)
  const y2 = (45 - 35 * Math.sin(angle)).toFixed(1)
  const largeArc = p > 50 ? 1 : 0
  const gId = "g" + color.replace("#","")
  return (
    <svg viewBox="0 0 100 50" className="w-full">
      <defs>
        <linearGradient id={gId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <path d="M 10 45 A 35 35 0 0 1 90 45" fill="none" stroke="var(--ds-muted)" strokeLinecap="round" strokeWidth="7" />
      {p > 0 && (
        <path d={"M 10 45 A 35 35 0 " + largeArc + " 1 " + x2 + " " + y2}
          fill="none" stroke={"url(#" + gId + ")"} strokeLinecap="round" strokeWidth="7" />
      )}
      <line x1="50" y1="45" x2={x2} y2={y2} stroke="var(--ds-fg-subtle)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="50" cy="45" r="2.5" fill="var(--ds-fg-subtle)" />
    </svg>
  )
}

/* ── Barra de progreso ── */
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--ds-muted)" }}>
        <div
          className="h-full rounded-full origin-left"
          style={{
            width: "100%",
            transform: `scaleX(${pct / 100})`,
            background: color,
            transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
      <span className="text-[11px] font-bold w-8 text-right shrink-0"
        style={{ color, fontFamily: "Fira Code, monospace" }}>
        {value}
      </span>
    </div>
  )
}

/* ── Timeline ── */
type Ev = { id: string; tipo: string; titulo: string; fecha: string; color: string }

function buildTimeline(
  ms: Mantencion[], ps: Proyecto[], rs: Reparacion[],
  imps: Importacion[], cots: Cotizacion[], ots: OrdenTrabajo[]
): Ev[] {
  return [
    ...ms.map(m => ({ id: m.id, tipo: "MANT", titulo: m.equipo, fecha: m.creadoEn, color: "var(--ds-warning)" })),
    ...ps.map(p => ({ id: p.id, tipo: "FABR", titulo: p.nombre, fecha: p.creadoEn, color: "#7C3AED" })),
    ...rs.map(r => ({ id: r.id, tipo: "REP",  titulo: r.equipo, fecha: r.creadoEn, color: "#0369A1" })),
    ...imps.map(i => ({ id: i.id, tipo: "IMP", titulo: i.descripcion.slice(0, 28), fecha: i.creadoEn, color: "#0891B2" })),
    ...cots.map(c => ({ id: c.id, tipo: "COT", titulo: c.numero + " — " + c.cliente, fecha: c.creadoEn, color: "var(--ds-success)" })),
    ...ots.map(o => ({ id: o.id, tipo: "OT",   titulo: o.numero + " — " + o.cliente, fecha: o.creadoEn, color: "#6366F1" })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 10)
}

function fFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
  } catch { return iso }
}
function fCLP(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}
function saludo() {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 19) return "Buenas tardes"
  return "Buenas noches"
}

export default function Dashboard() {
  const { user } = useAuth()
  const [ms, setMs] = useState<Mantencion[]>([])
  const [ps, setPs] = useState<Proyecto[]>([])
  const [rs, setRs] = useState<Reparacion[]>([])
  const [bs, setBs] = useState<ItemBodega[]>([])
  const [imps, setImps] = useState<Importacion[]>([])
  const [cs, setCs] = useState<ContratoArriendo[]>([])
  const [cots, setCots] = useState<Cotizacion[]>([])
  const [ots, setOts] = useState<OrdenTrabajo[]>([])

  useEffect(() => {
    setMs(mantenciones.getAll())
    setPs(proyectos.getAll())
    setRs(reparaciones.getAll())
    setBs(bodega.getAll())
    setImps(importaciones.getAll())
    const hoy = new Date().toISOString().slice(0, 10)
    contratos.getAll().forEach(c => {
      if (c.estado === "activo" && c.fechaTermino < hoy) contratos.update(c.id, { estado: "vencido" })
    })
    setCs(contratos.getAll())
    setCots(cotizaciones.getAll())
    setOts(ordenesTrabajo.getAll())
  }, [])

  const hoy = new Date().toISOString().slice(0, 10)
  const primerNombre = user?.nombre?.split(" ")[0] ?? "equipo"
  const fechaHoy = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  const arriendosAlerta = cs.filter(c => {
    if (c.estado === "finalizado" || c.estado === "suspendido") return false
    return Math.ceil((new Date(c.fechaTermino).getTime() - new Date(hoy).getTime()) / 86400000) <= (c.diasAviso ?? 7)
  })

  const alertasBanner = [
    ...bs.filter(i => i.cantidad <= i.cantidadMinima).map(i => ({
      msg: "Stock bajo: " + i.nombre + " — " + i.cantidad + " " + i.unidad + " restantes",
      href: "/bodega", nivel: i.cantidad === 0 ? "critico" : "adv",
    })),
    ...ms.filter(m => m.estado === "pendiente" && m.proximaMantencion && m.proximaMantencion <= hoy).map(m => ({
      msg: "Mantención vencida: " + m.equipo, href: "/mantencion", nivel: "adv",
    })),
    ...arriendosAlerta.map(c => {
      const d = Math.ceil((new Date(c.fechaTermino).getTime() - new Date(hoy).getTime()) / 86400000)
      return {
        msg: d < 0 ? "Contrato vencido: " + c.equipo : "Contrato por vencer: " + c.equipo + " (faltan " + d + " días)",
        href: "/arriendo", nivel: d < 0 ? "critico" : "adv",
      }
    }),
  ]

  const repTotal = rs.length
  const repActivo = rs.filter(r => ["diagnostico","en_reparacion","esperando_repuestos"].includes(r.estado)).length
  const repPct = repTotal > 0 ? Math.round((repActivo / repTotal) * 100) : 0

  const kpis = [
    {
      href: "/mantencion", label: "Mantención", Icon: Wrench,
      valor: ms.filter(x => x.estado !== "completado").length,
      total: ms.length, sufijo: "pendientes",
      color: "var(--ds-warning)", bg: "#FEF3C7",
    },
    {
      href: "/reparacion", label: "Reparación", Icon: Settings,
      valor: rs.filter(x => x.estado !== "entregado").length,
      total: rs.length, sufijo: "en progreso",
      color: "#0369A1", bg: "#DBEAFE",
    },
    {
      href: "/bodega", label: "Stock crítico", Icon: Package,
      valor: bs.filter(x => x.cantidad <= x.cantidadMinima).length,
      total: bs.length, sufijo: "ítems bajo mínimo",
      color: bs.some(x => x.cantidad === 0) ? "var(--ds-danger)" : "var(--ds-warning)",
      bg: bs.some(x => x.cantidad === 0) ? "#FEE2E2" : "#FEF3C7",
    },
    {
      href: "/arriendo", label: "Arriendos", Icon: KeyRound,
      valor: cs.filter(c => c.estado === "activo").length,
      total: cs.length, sufijo: arriendosAlerta.length > 0 ? arriendosAlerta.length + " alertas" : "activos",
      color: "#7C3AED", bg: "#EDE9FE",
    },
    {
      href: "/ordenes", label: "Órdenes de Trabajo", Icon: ClipboardList,
      valor: ots.filter(o => o.estado !== "completada" && o.estado !== "cancelada").length,
      total: ots.length, sufijo: "en curso",
      color: "#6366F1", bg: "#EEF2FF",
    },
    {
      href: "/cotizaciones", label: "Cotizaciones", Icon: FileText,
      valor: fCLP(cots.filter(c => c.estado === "aceptada").reduce((s, c) => s + c.total, 0)),
      total: null, sufijo: "en cotiz. aceptadas",
      color: "var(--ds-success)", bg: "#D1FAE5", str: true,
    },
  ]

  const timeline = buildTimeline(ms, ps, rs, imps, cots, ots)

  const mantencionStats = [
    { label: "Pendiente",  value: ms.filter(m => m.estado === "pendiente").length,  color: "var(--ds-warning)" },
    { label: "En proceso", value: ms.filter(m => m.estado === "en_proceso").length, color: "#0369A1" },
    { label: "Completado", value: ms.filter(m => m.estado === "completado").length, color: "var(--ds-success)" },
  ]
  const totalMant = mantencionStats.reduce((s, r) => s + r.value, 0)

  const otStats = [
    { label: "Pendiente",   value: ots.filter(o => o.estado === "pendiente").length,   color: "var(--ds-warning)" },
    { label: "En curso",    value: ots.filter(o => o.estado === "en_curso").length,     color: "#0369A1" },
    { label: "Completada",  value: ots.filter(o => o.estado === "completada").length,   color: "var(--ds-success)" },
    { label: "Cancelada",   value: ots.filter(o => o.estado === "cancelada").length,    color: "var(--ds-danger)" },
  ]
  const totalOT = otStats.reduce((s, r) => s + r.value, 0)

  const repPieData = [
    { label: "Recibido",  value: rs.filter(r => r.estado === "recibido").length,       color: "#F59E0B" },
    { label: "Reparando", value: rs.filter(r => r.estado === "en_reparacion").length,  color: "#0369A1" },
    { label: "Listo",     value: rs.filter(r => r.estado === "listo").length,          color: "#059669" },
    { label: "Entregado", value: rs.filter(r => r.estado === "entregado").length,      color: "#94A3B8" },
  ].filter(d => d.value > 0)

  return (
    <div className="px-6 pb-8 pt-6 space-y-6 stagger-children max-w-[1600px] mx-auto">

      {/* ── Bienvenida ── */}
      <div
        className="ds-card p-6 flex items-center justify-between gap-4"
        style={{
          background: "linear-gradient(135deg, var(--ds-primary) 0%, var(--ds-secondary) 100%)",
          border: "none",
        }}
      >
        <div>
          <p
            className="text-[11px] uppercase tracking-widest font-medium mb-1 capitalize"
            style={{ color: "rgba(255,255,255,0.45)", fontFamily: "Fira Code, monospace" }}
          >
            {fechaHoy}
          </p>
          <h2 className="text-2xl font-bold text-white leading-tight">
            {saludo()}, {primerNombre}
          </h2>
          <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            Resumen operacional del sistema Minserco.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-white" style={{ fontFamily: "Fira Code, monospace" }}>
              {ms.filter(x => x.estado === "completado").length + rs.filter(x => x.estado === "entregado").length}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>Completados</div>
          </div>
          <div className="h-10 w-px" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: "#7DD3FC", fontFamily: "Fira Code, monospace" }}>
              {ms.filter(x => x.estado !== "completado").length + rs.filter(x => x.estado !== "entregado").length}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>En progreso</div>
          </div>
          <div className="h-10 w-px" style={{ background: "rgba(255,255,255,0.15)" }} />
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: alertasBanner.length > 0 ? "#FCA5A5" : "#6EE7B7", fontFamily: "Fira Code, monospace" }}>
              {alertasBanner.length}
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>Alertas</div>
          </div>
        </div>
      </div>

      {/* ── Almacenamiento ── */}
      <StorageMeter />

      {/* ── Alertas ── */}
      {alertasBanner.length > 0 && (
        <div
          className="ds-card p-4"
          style={{
            border: "1px solid rgba(220,38,38,0.20)",
            background: "rgba(220,38,38,0.03)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} style={{ color: "var(--ds-danger)" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--ds-danger)" }}>
              {alertasBanner.filter(a => a.nivel === "critico").length > 0
                ? alertasBanner.filter(a => a.nivel === "critico").length + " crítica" + (alertasBanner.filter(a => a.nivel === "critico").length > 1 ? "s" : "") + " · "
                : ""
              }
              {alertasBanner.length} alerta{alertasBanner.length > 1 ? "s" : ""} requieren atención
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {alertasBanner.map((a, i) => (
              <Link
                key={i}
                href={a.href}
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg group"
                style={{
                  background: a.nivel === "critico" ? "rgba(220,38,38,0.06)" : "rgba(217,119,6,0.06)",
                  border: "1px solid " + (a.nivel === "critico" ? "rgba(220,38,38,0.15)" : "rgba(217,119,6,0.15)"),
                  transition: "background 150ms",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = a.nivel === "critico" ? "rgba(220,38,38,0.10)" : "rgba(217,119,6,0.10)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = a.nivel === "critico" ? "rgba(220,38,38,0.06)" : "rgba(217,119,6,0.06)"}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: a.nivel === "critico" ? "var(--ds-danger)" : "var(--ds-warning)" }}
                  />
                  <span className="text-[12px] truncate" style={{ color: a.nivel === "critico" ? "#DC2626" : "#B45309" }}>
                    {a.msg}
                  </span>
                </div>
                <ArrowRight size={11} className="shrink-0 opacity-0 group-hover:opacity-100" style={{ color: "var(--ds-fg-subtle)", transition: "opacity 150ms" }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map(({ href, label, valor, sufijo, Icon, color, bg, str, total }) => (
          <Link key={href + label} href={href} className="block">
            <div className="ds-card ds-card-interactive p-5 h-full relative overflow-hidden cursor-pointer">
              {/* Icon badge */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: bg }}
              >
                <Icon size={16} style={{ color }} />
              </div>

              {/* Value */}
              {str
                ? <div className="text-[15px] font-bold leading-none mb-1 truncate" style={{ color: "var(--ds-fg)", fontFamily: "Fira Code, monospace" }}>{valor as string}</div>
                : <div className="text-3xl font-black leading-none mb-1" style={{ color, fontFamily: "Fira Code, monospace" }}>{valor as number}</div>
              }

              {/* Label */}
              <div className="text-[11px] font-semibold mb-0.5" style={{ color: "var(--ds-fg)" }}>{label}</div>
              <div className="text-[10px]" style={{ color: "var(--ds-fg-subtle)" }}>{sufijo}</div>

              {/* Bottom accent bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[3px]"
                style={{ background: "linear-gradient(90deg, " + color + "60, " + color + "10)" }}
              />
            </div>
          </Link>
        ))}
      </section>

      {/* ── Middle row: gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Mantenciones — bar chart */}
        <div className="ds-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                <Wrench size={13} style={{ color: "var(--ds-warning)" }} />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>Mantenciones</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
              {totalMant} total
            </span>
          </div>
          {totalMant === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: "var(--ds-fg-subtle)", opacity: 0.3 }} />
              <p className="text-[12px]" style={{ color: "var(--ds-fg-subtle)" }}>Sin mantenciones registradas</p>
            </div>
          ) : (
            <BarChartSVG data={mantencionStats} />
          )}
        </div>

        {/* Reparaciones — pie chart */}
        <div className="ds-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#DBEAFE" }}>
                <Settings size={13} style={{ color: "#0369A1" }} />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>Reparaciones</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
              {rs.length} total
            </span>
          </div>
          {rs.length === 0 ? (
            <div className="py-8 text-center">
              <Settings size={24} className="mx-auto mb-2" style={{ color: "var(--ds-fg-subtle)", opacity: 0.3 }} />
              <p className="text-[12px]" style={{ color: "var(--ds-fg-subtle)" }}>Sin reparaciones registradas</p>
            </div>
          ) : (
            <PieChartSVG data={repPieData} />
          )}
        </div>

        {/* OTs — bar chart */}
        <div className="ds-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#EEF2FF" }}>
                <ClipboardList size={13} style={{ color: "#6366F1" }} />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>Órdenes de Trabajo</span>
            </div>
            <span className="text-[11px] font-bold" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
              {totalOT} total
            </span>
          </div>
          {totalOT === 0 ? (
            <div className="py-8 text-center">
              <AlertCircle size={24} className="mx-auto mb-2" style={{ color: "var(--ds-fg-subtle)", opacity: 0.3 }} />
              <p className="text-[12px]" style={{ color: "var(--ds-fg-subtle)" }}>Sin órdenes registradas</p>
            </div>
          ) : (
            <BarChartSVG data={otStats} />
          )}
        </div>

      </div>

      {/* ── Bottom row: timeline + stock ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Actividad reciente (span 2) */}
        {timeline.length > 0 && (
          <div className="ds-card p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--ds-muted)" }}>
                <Activity size={13} style={{ color: "var(--ds-fg-muted)" }} />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>Actividad Reciente</span>
              <span className="text-[11px]" style={{ color: "var(--ds-fg-subtle)" }}>· últimos registros</span>
            </div>
            <div className="space-y-0.5">
              {timeline.map((ev, i) => (
                <div
                  key={ev.id + i}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg group"
                  style={{ transition: "background 150ms" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--ds-muted)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ev.color }} />
                  <span
                    className="text-[9px] font-bold uppercase tracking-widest shrink-0 w-10"
                    style={{ color: ev.color, fontFamily: "Fira Code, monospace" }}
                  >
                    {ev.tipo}
                  </span>
                  <span className="text-[13px] flex-1 truncate" style={{ color: "var(--ds-fg)" }}>{ev.titulo}</span>
                  <span className="text-[11px] shrink-0" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
                    {fFecha(ev.fecha)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock crítico */}
        <div className="ds-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                <Package size={13} style={{ color: "var(--ds-warning)" }} />
              </div>
              <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>Stock Crítico</span>
            </div>
            <Link href="/bodega">
              <span className="text-[11px]" style={{ color: "var(--ds-accent)", fontFamily: "Fira Code, monospace" }}>
                Ver bodega →
              </span>
            </Link>
          </div>
          {bs.filter(i => i.cantidad <= i.cantidadMinima).length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: "var(--ds-success)", opacity: 0.5 }} />
              <p className="text-[12px]" style={{ color: "var(--ds-fg-subtle)" }}>Stock en niveles normales</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bs.filter(i => i.cantidad <= i.cantidadMinima).slice(0, 6).map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{
                    background: item.cantidad === 0 ? "rgba(220,38,38,0.04)" : "rgba(217,119,6,0.04)",
                    border: "1px solid " + (item.cantidad === 0 ? "rgba(220,38,38,0.12)" : "rgba(217,119,6,0.12)"),
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium truncate" style={{ color: "var(--ds-fg)" }}>{item.nombre}</div>
                    <div className="text-[10px]" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
                      mín: {item.cantidadMinima} {item.unidad}
                    </div>
                  </div>
                  <span
                    className="text-[12px] font-bold shrink-0 ml-2"
                    style={{
                      color: item.cantidad === 0 ? "var(--ds-danger)" : "var(--ds-warning)",
                      fontFamily: "Fira Code, monospace",
                    }}
                  >
                    {item.cantidad} {item.unidad}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
