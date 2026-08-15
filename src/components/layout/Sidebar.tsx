"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Wrench, Factory, Settings, Package, Ship,
  LayoutDashboard, KeyRound, Activity, Users,
  FileText, ClipboardList, CalendarDays, Calendar, BarChart3, ShieldCheck,
  LogOut, HardHat, Building2, ChevronRight, Receipt, ClipboardCheck,
  CheckSquare, History, Bell, Droplets,
} from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"
import { mantenciones, bodega, reparaciones, contratos } from "@/lib/store"
import { useAuth } from "@/lib/auth"

type NavItem = { href: string; label: string; icon: React.ElementType; group?: string }

const nav: NavItem[] = [
  { href: "/",            label: "Panel General",      icon: LayoutDashboard },
  { href: "/actividad",   label: "Actividad",           icon: Activity },
  { href: "/mantencion",  label: "Mantención",    icon: Wrench,        group: "Operaciones" },
  { href: "/fabricacion", label: "Fabricación",   icon: Factory,       group: "Operaciones" },
  { href: "/reparacion",  label: "Reparación",    icon: Settings,      group: "Operaciones" },
  { href: "/clientes",    label: "Equipos en Terreno", icon: Users,         group: "Terreno" },
  { href: "/instalacion", label: "Instalación",         icon: Droplets,      group: "Terreno" },
  { href: "/ordenes",     label: "Órdenes de Trabajo", icon: ClipboardList, group: "Terreno" },
  { href: "/tecnicos",    label: "Técnicos y Agenda", icon: CalendarDays,  group: "Terreno" },
  { href: "/cotizaciones",label: "Cotizaciones",       icon: FileText,      group: "Comercial" },
  { href: "/arriendo",    label: "Arriendo",           icon: KeyRound,      group: "Comercial" },
  { href: "/bodega",      label: "Control Bodega",     icon: Package,       group: "Logística" },
  { href: "/importacion", label: "Importación",        icon: Ship,          group: "Logística" },
  { href: "/reportes",    label: "Reportes",           icon: BarChart3,     group: "Logística" },
  { href: "/calendario",  label: "Calendario",         icon: Calendar,      group: "Logística" },
  { href: "/proveedores", label: "Proveedores",        icon: Building2,     group: "Logística" },
  { href: "/gastos",           label: "Rendición Gastos",   icon: Receipt,       group: "Documentos" },
  { href: "/informes-entrega", label: "Informes Entrega",   icon: ClipboardCheck,group: "Documentos" },
  { href: "/checklist",        label: "Checklist Equipos",  icon: CheckSquare,   group: "Documentos" },
  { href: "/admin/alertas",    label: "Config. Alertas",    icon: Bell,          group: "Admin" },
]

const TECNICO_ROUTES = [
  "/mantencion", "/reparacion", "/clientes", "/ordenes",
  "/gastos", "/informes-entrega",
]

// Módulo en desarrollo: solo visible para esta cuenta hasta su lanzamiento
const INSTALACION_EMAIL = "n.palacios.marchant@gmail.com"

const SB = {
  bg:            "#0e1a35",
  bgLogo:        "#0a1428",
  groupLabel:    "rgba(255,255,255,0.32)",
  itemDefault:   "rgba(255,255,255,0.58)",
  itemHoverBg:   "rgba(255,255,255,0.06)",
  itemActiveBg:  "rgba(255,255,255,0.10)",
  itemActiveText:"#ffffff",
  accent:        "#f59e0b",
  border:        "rgba(255,255,255,0.07)",
  footerBg:      "rgba(255,255,255,0.05)",
}

export default function Sidebar() {
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
    const arriendoAlerta = cs.filter(c => {
      const diasRest = Math.ceil((new Date(c.fechaTermino).getTime() - new Date(hoy).getTime()) / 86400000)
      return diasRest <= (c.diasAviso ?? 7)
    }).length
    setAlertas({
      stock:      b.filter(i => i.cantidad <= i.cantidadMinima).length,
      mantencion: m.filter(x => x.estado === "pendiente").length,
      reparacion: r.filter(x => x.estado === "listo").length,
      arriendo:   arriendoAlerta,
    })
  }, [pathname])

  const badges: Record<string, number> = {
    "/bodega":     alertas.stock,
    "/mantencion": alertas.mantencion,
    "/reparacion": alertas.reparacion,
    "/arriendo":   alertas.arriendo,
  }

  const esAdmin = user?.rol === "admin"
  const esNicolas = (user?.email ?? "").toLowerCase() === INSTALACION_EMAIL.toLowerCase()
  const visibleNav = nav.filter(item => {
    if (item.href === "/instalacion") return esNicolas
    return esAdmin ? true : TECNICO_ROUTES.includes(item.href)
  })

  function handleLogout() {
    logout()
    router.push("/login")
  }

  return (
    <aside
      className="w-64 min-h-screen flex flex-col shrink-0"
      style={{ background: SB.bg, borderRight: `1px solid ${SB.border}` }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center px-4 shrink-0"
        style={{ minHeight: "68px", background: SB.bgLogo, borderBottom: `1px solid ${SB.border}` }}
      >
        <Image
          src="/logo_minserco.png?v=2"
          alt="Minserco"
          width={160}
          height={54}
          className="object-contain"
          style={{ width: "150px", height: "auto" }}
          priority
          unoptimized
        />
      </div>

      {/* Nav */}
      <nav className="sidebar-dark flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {(() => {
          const rendered: React.ReactNode[] = []
          let lastGroup: string | undefined = undefined

          visibleNav.forEach(({ href, label, icon: Icon, group }) => {
            if (group !== lastGroup) {
              if (group) {
                rendered.push(
                  <div
                    key={`g-${group}`}
                    className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-5 pb-1.5"
                    style={{ color: SB.groupLabel }}
                  >
                    {group}
                  </div>
                )
              }
              lastGroup = group
            }

            const active = href === "/" ? pathname === "/" : pathname.startsWith(href)
            const badge = badges[href]

            rendered.push(
              <Link
                key={href}
                href={href}
                className="group relative flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium"
                style={{
                  color: active ? SB.itemActiveText : SB.itemDefault,
                  background: active ? SB.itemActiveBg : "transparent",
                  transition: "background 150ms ease, color 150ms ease",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = SB.itemHoverBg
                    ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.88)"
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = "transparent"
                    ;(e.currentTarget as HTMLElement).style.color = SB.itemDefault
                  }
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                    style={{ height: "20px", background: SB.accent }}
                  />
                )}
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.2 : 1.8}
                    style={{ color: active ? SB.accent : "inherit", flexShrink: 0 }}
                  />
                  <span className="text-[13px] truncate">{label}</span>
                </div>
                {badge != null && badge > 0 ? (
                  <span
                    className="text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none shrink-0"
                    style={{
                      background: active ? "rgba(245,158,11,0.35)" : "rgba(239,68,68,0.25)",
                      color: active ? "#fde68a" : "#fca5a5",
                    }}
                  >
                    {badge}
                  </span>
                ) : active ? (
                  <ChevronRight size={12} style={{ color: SB.accent, opacity: 0.7, flexShrink: 0 }} />
                ) : null}
              </Link>
            )
          })

          return rendered
        })()}

        {esAdmin && (
          <>
            <div
              className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-5 pb-1.5"
              style={{ color: SB.groupLabel }}
            >
              Admin
            </div>
            <Link
              href="/admin/usuarios"
              className="relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium"
              style={{
                color: pathname.startsWith("/admin") ? SB.itemActiveText : SB.itemDefault,
                background: pathname.startsWith("/admin") ? SB.itemActiveBg : "transparent",
                transition: "background 150ms ease, color 150ms ease",
              }}
              onMouseEnter={e => {
                if (!pathname.startsWith("/admin")) {
                  ;(e.currentTarget as HTMLElement).style.background = SB.itemHoverBg
                  ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.88)"
                }
              }}
              onMouseLeave={e => {
                if (!pathname.startsWith("/admin")) {
                  ;(e.currentTarget as HTMLElement).style.background = "transparent"
                  ;(e.currentTarget as HTMLElement).style.color = SB.itemDefault
                }
              }}
            >
              {pathname.startsWith("/admin") && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                  style={{ height: "20px", background: SB.accent }}
                />
              )}
              <ShieldCheck
                size={15}
                strokeWidth={pathname.startsWith("/admin") ? 2.2 : 1.8}
                style={{ color: pathname.startsWith("/admin") ? SB.accent : "inherit", flexShrink: 0 }}
              />
              Gestión de Usuarios
            </Link>
          </>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-3 shrink-0" style={{ borderTop: `1px solid ${SB.border}` }}>
          <div
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl"
            style={{ background: SB.footerBg }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                background: esAdmin ? "rgba(245,158,11,0.20)" : "rgba(139,92,246,0.20)",
                color:      esAdmin ? "#fcd34d" : "#c4b5fd",
                border:     `1px solid ${esAdmin ? "rgba(245,158,11,0.30)" : "rgba(139,92,246,0.30)"}`,
              }}
            >
              {user.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.90)" }}>
                {user.nombre}
              </div>
              <div className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.38)" }}>
                {esAdmin ? <ShieldCheck size={9} /> : <HardHat size={9} />}
                {esAdmin ? "Administrador" : "Técnico"}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="p-1.5 rounded-lg shrink-0"
              style={{ color: "rgba(255,255,255,0.35)", transition: "color 150ms ease, background 150ms ease" }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.color = "#fca5a5"
                ;(e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.15)"
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"
                ;(e.currentTarget as HTMLElement).style.background = "transparent"
              }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </aside>  )
}
