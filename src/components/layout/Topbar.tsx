"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  Menu, X, Bell, AlertTriangle, Package, Wrench,
  KeyRound, ShieldAlert, Search, ChevronRight, Mail, Ship, Radio, Wallet,
} from "lucide-react"
import { mantenciones, bodega, reparaciones, contratos, clientesEquipos, importaciones, nodos, pagos } from "@/lib/store"
import { useAlertScheduler } from "@/lib/useAlertScheduler"
import { useCallback } from "react"
import GlobalSearch from "./GlobalSearch"
import { useAuth } from "@/lib/auth"

interface Alerta {
  id: string
  tipo: "stock" | "mantencion" | "reparacion" | "arriendo" | "garantia" | "recordatorio" | "importacion" | "nodo" | "pago"
  titulo: string
  detalle: string
  urgente: boolean
}

const iconoTipo: Record<string, React.ElementType> = {
  stock: Package, mantencion: Wrench, reparacion: Wrench,
  arriendo: KeyRound, garantia: ShieldAlert, importacion: Ship, nodo: Radio, pago: Wallet,
}
const colorTipo: Record<string, string> = {
  stock: "#DC2626", mantencion: "#D97706", reparacion: "#0369A1",
  arriendo: "#7C3AED", garantia: "#D97706",
}
const labelTipo: Record<string, string> = {
  stock: "Bodega", mantencion: "Mantención", reparacion: "Reparación",
  arriendo: "Arriendo", garantia: "Garantía", importacion: "Importación", recordatorio: "Recordatorio", nodo: "Nodo", pago: "Pago",
}

function buildAlertas(): Alerta[] {
  const out: Alerta[] = []
  const hoy = new Date()
  bodega.getAll().filter(i => i.cantidad <= i.cantidadMinima).forEach(i => {
    out.push({ id: "stock-" + i.id, tipo: "stock",
      titulo: "Stock bajo: " + i.nombre,
      detalle: i.cantidad + " " + i.unidad + " (mín. " + i.cantidadMinima + ")",
      urgente: i.cantidad === 0 })
  })
  mantenciones.getAll().filter(m => m.estado !== "completado").forEach(m => {
    const tecs = (m.tecnicos && m.tecnicos.length ? m.tecnicos.join(", ") : m.tecnico)
    // Recordatorio por próxima mantención: 7 días antes y todos los días hasta cumplirse (y vencidas)
    if (m.proximaMantencion) {
      const dias = Math.ceil((new Date(m.proximaMantencion).getTime() - hoy.getTime()) / 86400000)
      if (dias <= 7) {
        const titulo = dias < 0 ? "Mantención vencida: " + m.equipo
          : dias === 0 ? "Mantención HOY: " + m.equipo
          : "Próxima mantención: " + m.equipo
        const detalle = dias < 0 ? "Venció hace " + Math.abs(dias) + " día(s) · " + tecs
          : dias === 0 ? "Programada para hoy · " + tecs
          : "Faltan " + dias + " día(s) · " + m.proximaMantencion
        out.push({ id: "mantprox-" + m.id, tipo: "mantencion", titulo, detalle, urgente: dias <= 1 })
        return
      }
    }
    // Si no está dentro de la ventana, mostrar las pendientes como recordatorio simple
    if (m.estado === "pendiente") {
      out.push({ id: "mant-" + m.id, tipo: "mantencion",
        titulo: "Mantención pendiente: " + m.equipo,
        detalle: tecs + " · " + m.fecha, urgente: false })
    }
  })
  reparaciones.getAll().filter(r => r.estado === "listo").forEach(r => {
    out.push({ id: "rep-" + r.id, tipo: "reparacion",
      titulo: "Listo para entregar: " + r.equipo,
      detalle: "Cliente: " + r.cliente, urgente: false })
  })
  contratos.getAll().filter(c => c.estado === "activo" || c.estado === "vencido").forEach(c => {
    const dias = Math.ceil((new Date(c.fechaTermino).getTime() - hoy.getTime()) / 86400000)
    if (dias <= (c.diasAviso ?? 7)) {
      out.push({ id: "arr-" + c.id, tipo: "arriendo",
        titulo: dias < 0 ? "Contrato vencido: " + c.equipo : "Por vencer: " + c.equipo,
        detalle: c.cliente + " · " + (dias < 0 ? "Venció hace " + Math.abs(dias) + "d" : "Vence en " + dias + "d"),
        urgente: dias <= 0 })
    }
  })
  clientesEquipos.getAll().forEach(e => {
    if (!e.garantiaHasta) return
    const dias = Math.ceil((new Date(e.garantiaHasta).getTime() - hoy.getTime()) / 86400000)
    if (dias < 0) {
      out.push({ id: "gar-" + e.id, tipo: "garantia",
        titulo: "Garantía vencida: " + e.equipo,
        detalle: e.empresa + " · " + e.ciudad, urgente: false })
    } else if (dias <= 30) {
      out.push({ id: "gar-" + e.id, tipo: "garantia",
        titulo: "Garantía por vencer: " + e.equipo,
        detalle: e.empresa + " · Vence en " + dias + "d", urgente: dias <= 7 })
    }
  })
  importaciones.getAll()
    .filter(im => im.fechaEstimada && im.estado !== "recibido" && im.estado !== "distribuido")
    .forEach(im => {
      const dias = Math.ceil((new Date(im.fechaEstimada!).getTime() - hoy.getTime()) / 86400000)
      if (dias <= 7) {
        out.push({
          id: "imp-" + im.id, tipo: "importacion",
          titulo: dias < 0 ? "Importación atrasada: " + im.descripcion
            : dias === 0 ? "Importación llega HOY: " + im.descripcion
            : "Importación próxima: " + im.descripcion,
          detalle: im.proveedor + " · " + (dias < 0 ? "Estimada hace " + Math.abs(dias) + "d" : dias === 0 ? "Llega hoy" : "Llega en " + dias + "d") + (im.numeroTracking ? " · " + im.numeroTracking : ""),
          urgente: dias <= 1,
        })
      }
    })
  nodos.getAll()
    .filter(n => n.estado === "activo" && n.fechaTermino)
    .forEach(n => {
      const dias = Math.ceil((new Date(n.fechaTermino!).getTime() - hoy.getTime()) / 86400000)
      if (dias <= 7) {
        out.push({
          id: "nodo-" + n.id, tipo: "nodo",
          titulo: dias < 0 ? "Servicio vencido: " + n.equipo
            : dias === 0 ? "Servicio vence HOY: " + n.equipo
            : "Servicio por vencer: " + n.equipo,
          detalle: (n.cliente ? n.cliente + " · " : "") + (dias < 0 ? "Venció hace " + Math.abs(dias) + "d" : dias === 0 ? "Vence hoy" : "Vence en " + dias + "d") + (n.numeroSim ? " · SIM " + n.numeroSim : ""),
          urgente: dias <= 1,
        })
      }
    })
  pagos.getAll()
    .filter(p => p.estado !== "pagado" && p.fechaVencimiento)
    .forEach(p => {
      const dias = Math.ceil((new Date(p.fechaVencimiento!).getTime() - hoy.getTime()) / 86400000)
      if (dias <= 7) {
        out.push({
          id: "pago-" + p.id, tipo: "pago",
          titulo: dias < 0 ? "Pago vencido: " + p.concepto
            : dias === 0 ? "Pago vence HOY: " + p.concepto
            : "Pago por vencer: " + p.concepto,
          detalle: (p.contraparte ? p.contraparte + " · " : "") + (dias < 0 ? "Venció hace " + Math.abs(dias) + "d" : dias === 0 ? "Vence hoy" : "Vence en " + dias + "d"),
          urgente: dias <= 1,
        })
      }
    })
  return out.sort((a, b) => (b.urgente ? 1 : 0) - (a.urgente ? 1 : 0))
}

interface TopbarProps {
  onMenuToggle: () => void
  menuOpen: boolean
}

export default function Topbar({ onMenuToggle, menuOpen }: TopbarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const [leidas, setLeidas] = useState<Set<string>>(new Set())
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setAlertas(buildAlertas()); setBellOpen(false) }, [pathname])

  // Alertas programadas — se agregan a la campana cuando disparan
  const handleScheduledAlerts = useCallback((scheduled: import("@/lib/useAlertScheduler").AlertaScheduled[]) => {
    setAlertas(prev => {
      const existingIds = new Set(prev.map(a => a.id))
      const nuevas = scheduled
        .filter(s => !existingIds.has(s.id))
        .map(s => ({
          id: s.id,
          tipo: "recordatorio" as const,
          titulo: s.titulo,
          detalle: s.detalle,
          urgente: s.urgente,
        }))
      return nuevas.length > 0 ? [...nuevas, ...prev] : prev
    })
  }, [])
  useAlertScheduler(handleScheduledAlerts)
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener("mousedown", onClickOut)
    return () => document.removeEventListener("mousedown", onClickOut)
  }, [])

  const noLeidas = alertas.filter(a => !leidas.has(a.id)).length
  const urgentes = alertas.filter(a => a.urgente).length
  const esAdmin = user?.rol === "admin"

  const ahora = new Date()
  const fechaStr = ahora.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })

  return (
    <header className="topbar px-4 gap-3">

      {/* Hamburguesa */}
      <button
        onClick={onMenuToggle}
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuOpen}
        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
        style={{
          background: menuOpen ? "rgba(255,255,255,0.12)" : "transparent",
          color: menuOpen ? "#FFFFFF" : "rgba(255,255,255,0.55)",
          transition: "background 150ms ease, color 150ms ease",
        }}
        onMouseEnter={e => {
          if (!menuOpen) {
            ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"
            ;(e.currentTarget as HTMLElement).style.color = "#FFFFFF"
          }
        }}
        onMouseLeave={e => {
          if (!menuOpen) {
            ;(e.currentTarget as HTMLElement).style.background = "transparent"
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"
          }
        }}
      >
        <div style={{ transition: "transform 250ms ease" }}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </div>
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0 select-none">
        <Image
          src="/logo_minserco.png?v=2"
          alt="Minserco"
          width={130}
          height={44}
          className="object-contain"
          style={{ height: "32px", width: "auto" }}
          priority
          unoptimized
        />
      </div>

      {/* Separador vertical */}
      <div className="h-6 w-px shrink-0" style={{ background: "rgba(255,255,255,0.10)" }} />

      {/* Fecha */}
      <span
        className="text-[11px] hidden md:block shrink-0 capitalize"
        style={{ color: "rgba(255,255,255,0.38)", fontFamily: "Fira Code, monospace" }}
      >
        {fechaStr}
      </span>

      {/* Búsqueda funcional */}
      <GlobalSearch />

      <div className="flex-1" />

      {/* Campana */}
      <div className="relative shrink-0" ref={bellRef}>
        <button
          onClick={() => setBellOpen(v => !v)}
          aria-label="Alertas del sistema"
          className="relative flex items-center justify-center w-9 h-9 rounded-lg"
          style={{ color: "rgba(255,255,255,0.55)", transition: "background 150ms, color 150ms" }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"
            ;(e.currentTarget as HTMLElement).style.color = "#FFFFFF"
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = "transparent"
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"
          }}
        >
          <Bell size={17} className={noLeidas > 0 ? "bell-animate" : ""} />
          {noLeidas > 0 && (
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
              style={{
                background: urgentes > 0 ? "#DC2626" : "#D97706",
                borderColor: "var(--topbar-bg)",
              }}
            />
          )}
        </button>

        {/* Dropdown alertas */}
        {bellOpen && (
          <div
            className="absolute right-0 mt-2 rounded-xl overflow-hidden z-50"
            style={{
              width: "360px",
              background: "#FFFFFF",
              border: "1px solid var(--ds-border)",
              boxShadow: "var(--shadow-dropdown)",
              top: "100%",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--ds-border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>
                  Alertas del sistema
                </span>
                {noLeidas > 0 && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{
                      background: urgentes > 0 ? "#FEE2E2" : "#FEF3C7",
                      color: urgentes > 0 ? "#DC2626" : "#B45309",
                      fontFamily: "Fira Code, monospace",
                    }}
                  >
                    {noLeidas} nueva{noLeidas !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setLeidas(new Set(alertas.map(a => a.id))); setBellOpen(false) }}
                className="text-[11px] px-2 py-1 rounded-md"
                style={{ color: "var(--ds-fg-subtle)", transition: "background 150ms" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--ds-muted)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                Marcar todas leídas
              </button>
            </div>

            {/* Lista */}
            <div style={{ maxHeight: "380px", overflowY: "auto" }}>
              {alertas.length === 0 && (
                <div className="py-12 text-center">
                  <Bell size={28} className="mx-auto mb-3" style={{ color: "var(--ds-fg-subtle)", opacity: 0.3 }} />
                  <p className="text-[13px]" style={{ color: "var(--ds-fg-subtle)" }}>Sin alertas activas</p>
                </div>
              )}
              {alertas.map(a => {
                const Icon = iconoTipo[a.tipo]
                const color = colorTipo[a.tipo]
                const esLeida = leidas.has(a.id)
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer"
                    style={{
                      opacity: esLeida ? 0.4 : 1,
                      borderBottom: "1px solid var(--ds-border)",
                      transition: "background 150ms",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--ds-muted)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    onClick={() => setLeidas(s => new Set([...s, a.id]))}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: color + "15" }}
                    >
                      {a.urgente
                        ? <AlertTriangle size={13} style={{ color }} />
                        : <Icon size={13} style={{ color }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[12px] font-semibold leading-snug" style={{ color: "var(--ds-fg)" }}>
                          {a.titulo}
                        </span>
                        {a.urgente && (
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: "#FEE2E2", color: "#DC2626", fontFamily: "Fira Code, monospace" }}
                          >
                            URGENTE
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--ds-fg-subtle)" }}>
                        <span
                          className="px-1.5 py-0.5 rounded font-medium"
                          style={{ background: color + "12", color, fontFamily: "Fira Code, monospace", fontSize: "9px" }}
                        >
                          {(labelTipo[a.tipo] ?? a.tipo).toUpperCase()}
                        </span>
                        {a.detalle}
                      </div>
                    </div>
                    <ChevronRight size={12} style={{ color: "var(--ds-fg-subtle)", opacity: 0.5, flexShrink: 0, marginTop: "4px" }} />
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            {alertas.length > 0 && (
              <div
                className="px-4 py-2.5 flex items-center justify-between gap-2"
                style={{ borderTop: "1px solid var(--ds-border)" }}
              >
                <span className="text-[11px]" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
                  {urgentes > 0 && (
                    <span style={{ color: "#DC2626", fontWeight: 600 }}>{urgentes} urgente{urgentes !== 1 ? "s" : ""} · </span>
                  )}
                  {alertas.length} alerta{alertas.length !== 1 ? "s" : ""} en total
                </span>
                <button
                  onClick={() => {
                    const cuerpo = alertas.map(a =>
                      `[${a.urgente ? "⚠ URGENTE" : "●"}] ${a.titulo}\n   ${a.detalle}`
                    ).join("\n\n")
                    const subject = encodeURIComponent(`Resumen de alertas Minserco — ${new Date().toLocaleDateString("es-CL")}`)
                    const body = encodeURIComponent(`Alertas activas al ${new Date().toLocaleString("es-CL")}:\n\n${cuerpo}\n\n— Sistema Minserco`)
                    window.open(`mailto:?subject=${subject}&body=${body}`)
                  }}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: "var(--ds-accent)", color: "#fff", transition: "opacity 150ms" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
                >
                  <Mail size={11} /> Enviar resumen
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px shrink-0" style={{ background: "rgba(255,255,255,0.10)" }} />

      {/* Avatar + info */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-right hidden lg:block">
          <p className="text-[12px] font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.90)" }}>
            {user?.nombre ?? "Usuario"}
          </p>
          <p className="text-[10px] leading-tight" style={{ color: "rgba(255,255,255,0.38)", fontFamily: "Fira Code, monospace" }}>
            {esAdmin ? "Administrador" : "Técnico"}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: esAdmin ? "rgba(245,158,11,0.2)" : "rgba(139,92,246,0.2)", color: esAdmin ? "#f59e0b" : "#a78bfa" }}>
          {user?.nombre?.charAt(0).toUpperCase() ?? "U"}
        </div>
      </div>
    </header>
  )
}
