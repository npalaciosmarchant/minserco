"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Wrench, Factory, Settings, Package, Ship,
  LayoutDashboard, KeyRound, Activity, Users,
  FileText, ClipboardList, Calendar,
  BarChart3, ShieldCheck, LogOut, HardHat,
  Building2, ChevronRight, Receipt, ClipboardCheck,
  FolderOpen, CalendarClock, MapPin, Gavel, Radio, ListTodo,
} from "lucide-react"
import { useEffect, useState } from "react"
import { mantenciones, bodega, reparaciones, contratos } from "@/lib/store"
import { useAuth, canAccess } from "@/lib/auth"

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  group?: string
  desc?: string
}

const nav: NavItem[] = [
  { href: "/",            label: "Panel General",     icon: LayoutDashboard, desc: "Resumen operacional" },
  { href: "/actividad",   label: "Actividad",          icon: Activity,        desc: "Historial de eventos" },
  { href: "/mantencion",  label: "Mantención",   icon: Wrench,        group: "Operaciones", desc: "Preventiva y correctiva" },
  { href: "/equipos",     label: "Equipos",            icon: Package,       group: "Operaciones", desc: "Registro de equipos" },
  { href: "/fabricacion", label: "Fabricación",  icon: Factory,       group: "Operaciones", desc: "Proyectos de fabricación" },
  { href: "/reparacion",  label: "Reparación",   icon: Settings,      group: "Operaciones", desc: "Equipos en reparación" },
  { href: "/clientes",    label: "Equipos en Terreno", icon: Users,    group: "Terreno",    desc: "Equipos y garantías" },
  { href: "/ordenes",     label: "Órdenes de Trabajo", icon: ClipboardList, group: "Terreno", desc: "OTs y seguimiento" },
  { href: "/nodos",       label: "Nodos",              icon: Radio,         group: "Terreno", desc: "Servicio SIM de equipos" },
  { href: "/cotizaciones",label: "Cotizaciones",      icon: FileText,  group: "Comercial",  desc: "Presupuestos y propuestas" },
  { href: "/arriendo",    label: "Arriendo",           icon: KeyRound,  group: "Comercial",  desc: "Contratos y vencimientos" },
  { href: "/bodega",      label: "Control Bodega",     icon: Package,   group: "Logística",  desc: "Inventario y stock" },
  { href: "/importacion", label: "Importación",  icon: Ship,          group: "Logística",  desc: "Despachos y estado" },
  { href: "/reportes",    label: "Reportes",           icon: BarChart3, group: "Logística",  desc: "KPIs y análisis" },
  { href: "/calendario",  label: "Calendario",         icon: Calendar,  group: "Logística",  desc: "Planificación" },
  { href: "/proveedores", label: "Proveedores",        icon: Building2, group: "Logística",  desc: "Gestión de proveedores" },
  { href: "/gastos",           label: "Rendición de Gastos",  icon: Receipt,       group: "Documentos", desc: "Gastos y aprobaciones" },
  { href: "/informes-entrega", label: "Informes de Entrega",  icon: ClipboardCheck,group: "Documentos", desc: "Entrega de equipos" },
  { href: "/documentos",   label: "Presentación de Documentos", icon: FolderOpen,    group: "Administrativo", desc: "Documentos y presentaciones" },
  { href: "/reuniones",    label: "Agenda de Reuniones", icon: CalendarClock, group: "Administrativo", desc: "Reuniones y actas" },
  { href: "/visitas",      label: "Agenda de Visitas Técnicas", icon: MapPin,        group: "Administrativo", desc: "Visitas a terreno" },
  { href: "/licitaciones", label: "Licitaciones",       icon: Gavel,         group: "Administrativo", desc: "Propuestas y adjudicaciones" },
  { href: "/tareas",       label: "Tareas",             icon: ListTodo,      group: "Administrativo", desc: "Tareas administrativas" },
]

const TECNICO_ROUTES = ["/mantencion", "/equipos", "/reparacion", "/clientes", "/ordenes", "/gastos", "/informes-entrega"]

const groups = ["Operaciones", "Terreno", "Comercial", "Logística", "Documentos", "Administrativo"]

const groupColors: Record<string, string> = {
  "Operaciones": "#0369A1",
  "Terreno":     "#059669",
  "Comercial":   "#7C3AED",
  "Logística":   "#D97706",
  "Documentos":  "#059669",
  "Administrativo": "#4F46E5",
}

interface NavDrawerProps {
  open: boolean
  onClose: () => void
}

export default function NavDrawer({ open, onClose }: NavDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [alertas, setAlertas] = useState({ stock: 0, mantencion: 0, reparacion: 0, arriendo: 0 })

  useEffect(() => {
    const b = bodega.getAll()
    const m = mantenciones.getAll()
    const r = reparaciones.getAll()
    const hoy = new Date().toISOString().slice(0, 10)
    const cs = contratos.getAll().filter(c => c.estado === "activo" || c.estado === "vencido")
    const arr = cs.filter(c => {
      const d = Math.ceil((new Date(c.fechaTermino).getTime() - new Date(hoy).getTime()) / 86400000)
      return d <= (c.diasAviso ?? 7)
    }).length
    setAlertas({
      stock:      b.filter(i => i.cantidad <= i.cantidadMinima).length,
      mantencion: m.filter(x => x.estado === "pendiente").length,
      reparacion: r.filter(x => x.estado === "listo").length,
      arriendo:   arr,
    })
  }, [pathname])

  const badges: Record<string, number> = {
    "/bodega":     alertas.stock,
    "/mantencion": alertas.mantencion,
    "/reparacion": alertas.reparacion,
    "/arriendo":   alertas.arriendo,
  }

  const esAdmin = user?.rol === "admin"
  const visibleNav = nav.filter(item => esAdmin || TECNICO_ROUTES.includes(item.href) || canAccess(user, item.href))

  const ungrouped = visibleNav.filter(i => !i.group)

  function handleLogout() {
    logout()
    onClose()
    router.push("/login")
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href)
  }

  const NavLink = ({ href, label, icon: Icon, desc }: NavItem) => {
    const active = isActive(href)
    const badge = badges[href]
    return (
      <Link
        href={href}
        onClick={onClose}
        className="nav-drawer-item-enter flex items-center gap-3 px-3 py-2.5 rounded-lg group relative"
        style={{
          color: active ? "#FFFFFF" : "rgba(255,255,255,0.55)",
          background: active ? "rgba(3,105,161,0.25)" : "transparent",
          border: active ? "1px solid rgba(3,105,161,0.30)" : "1px solid transparent",
          transition: "all 150ms ease",
        }}
        onMouseEnter={e => {
          if (!active) {
            ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.88)"
            ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"
          }
        }}
        onMouseLeave={e => {
          if (!active) {
            ;(e.currentTarget as HTMLElement).style.background = "transparent"
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)"
            ;(e.currentTarget as HTMLElement).style.borderColor = "transparent"
          }
        }}
      >
        {/* Left accent */}
        {active && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
            style={{ width: "3px", height: "18px", background: "#0369A1" }}
          />
        )}

        {/* Icon */}
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: active ? "rgba(3,105,161,0.30)" : "rgba(255,255,255,0.06)",
            transition: "background 150ms",
          }}
        >
          <Icon size={14} strokeWidth={active ? 2.2 : 1.8}
            style={{ color: active ? "#7DD3FC" : "inherit" }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium leading-tight truncate">{label}</div>
          {desc && (
            <div className="text-[10px] leading-tight truncate mt-0.5"
              style={{ color: "rgba(255,255,255,0.30)", fontFamily: "Fira Code, monospace" }}>
              {desc}
            </div>
          )}
        </div>

        {/* Badge o chevron */}
        {badge != null && badge > 0 ? (
          <span
            className="text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shrink-0"
            style={{
              background: active ? "rgba(220,38,38,0.35)" : "rgba(220,38,38,0.20)",
              color: "#FCA5A5",
              fontFamily: "Fira Code, monospace",
            }}
          >
            {badge}
          </span>
        ) : active ? (
          <ChevronRight size={12} style={{ color: "#7DD3FC", opacity: 0.7, flexShrink: 0 }} />
        ) : null}
      </Link>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={"nav-drawer-backdrop" + (open ? " open" : "")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <nav className={"nav-drawer" + (open ? " open" : "")} aria-label="Navegación principal">

        {/* Ungrouped items */}
        <div className="px-3 pt-4 pb-2 space-y-0.5">
          {ungrouped.map(item => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {/* Grouped items */}
        {groups.map(group => {
          const items = visibleNav.filter(i => i.group === group)
          if (!items.length) return null
          const gColor = groupColors[group] ?? "#64748B"
          return (
            <div key={group} className="px-3 pb-2">
              <div
                className="flex items-center gap-2 px-2 py-2 mb-1"
                style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
              >
                <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.04)" }} />
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-1"
                  style={{ color: gColor, opacity: 0.7, fontFamily: "Fira Code, monospace" }}
                >
                  {group}
                </span>
                <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.04)" }} />
              </div>
              <div className="space-y-0.5">
                {items.map(item => <NavLink key={item.href} {...item} />)}
              </div>
            </div>
          )
        })}

        {/* Admin */}
        {esAdmin && (
          <div className="px-3 pb-2">
            <div
              className="flex items-center gap-2 px-2 py-2 mb-1"
              style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
            >
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.04)" }} />
              <span
                className="text-[9px] font-bold uppercase tracking-widest px-1"
                style={{ color: "#DC2626", opacity: 0.7, fontFamily: "Fira Code, monospace" }}
              >
                Admin
              </span>
              <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.04)" }} />
            </div>
            <NavLink
              href="/admin/usuarios"
              label="Gestión de Usuarios"
              icon={ShieldCheck}
              desc="Usuarios y permisos"
            />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User footer */}
        {user && (
          <div
            className="px-3 py-3 shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className="flex items-center gap-3 px-3 py-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0"
                style={{
                  background: esAdmin ? "rgba(3,105,161,0.25)" : "rgba(124,58,237,0.25)",
                  color: esAdmin ? "#7DD3FC" : "#C4B5FD",
                  border: "1px solid " + (esAdmin ? "rgba(3,105,161,0.30)" : "rgba(124,58,237,0.30)"),
                  fontFamily: "Fira Code, monospace",
                }}
              >
                {user.nombre.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.90)" }}>
                  {user.nombre}
                </div>
                <div className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "Fira Code, monospace" }}>
                  {esAdmin ? <ShieldCheck size={9} /> : <HardHat size={9} />}
                  {esAdmin ? "ADMINISTRADOR" : "TÉCNICO"}
                </div>
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                style={{ color: "rgba(255,255,255,0.30)", transition: "all 150ms" }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLElement).style.background = "rgba(220,38,38,0.20)"
                  ;(e.currentTarget as HTMLElement).style.color = "#FCA5A5"
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLElement).style.background = "transparent"
                  ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.30)"
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
