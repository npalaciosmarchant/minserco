"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Wrench, Settings, Package, KeyRound, FileText, ClipboardList, Users, Receipt, ClipboardCheck, Building2 } from "lucide-react"
import {
  mantenciones, reparaciones, bodega, contratos,
  cotizaciones, ordenesTrabajo, clientesEquipos, gastos, informesEntrega, proveedores,
} from "@/lib/store"

interface Result {
  id: string
  label: string
  sub: string
  href: string
  icon: React.ElementType
  color: string
}

function buscar(q: string): Result[] {
  if (!q.trim()) return []
  const t = q.toLowerCase()
  const has = (v?: string | null) => !!v && v.toLowerCase().includes(t)
  const res: Result[] = []

  mantenciones.getAll().filter(m =>
    has(m.equipo) || has(m.tecnico)
  ).slice(0, 3).forEach(m => res.push({
    id: "m" + m.id, label: m.equipo || "(sin equipo)", sub: "Mantención · " + (m.tecnico || ""),
    href: "/mantencion", icon: Wrench, color: "#D97706",
  }))

  reparaciones.getAll().filter(r =>
    has(r.equipo) || has(r.cliente)
  ).slice(0, 3).forEach(r => res.push({
    id: "r" + r.id, label: r.equipo || "", sub: "Reparación · " + (r.cliente || ""),
    href: "/reparacion", icon: Settings, color: "#0369A1",
  }))

  bodega.getAll().filter(b =>
    has(b.nombre)
  ).slice(0, 2).forEach(b => res.push({
    id: "b" + b.id, label: b.nombre || "", sub: "Bodega · " + (b.cantidad ?? 0) + " " + (b.unidad || ""),
    href: "/bodega", icon: Package, color: "#059669",
  }))

  contratos.getAll().filter(c =>
    has(c.equipo) || has(c.cliente)
  ).slice(0, 2).forEach(c => res.push({
    id: "c" + c.id, label: c.equipo || "", sub: "Arriendo · " + (c.cliente || ""),
    href: "/arriendo", icon: KeyRound, color: "#7C3AED",
  }))

  cotizaciones.getAll().filter(c =>
    has(c.numero) || has(c.cliente)
  ).slice(0, 2).forEach(c => res.push({
    id: "cot" + c.id, label: (c.numero || "") + " — " + (c.cliente || ""), sub: "Cotización",
    href: "/cotizaciones", icon: FileText, color: "#6366F1",
  }))

  ordenesTrabajo.getAll().filter(o =>
    has(o.numero) || has(o.cliente)
  ).slice(0, 2).forEach(o => res.push({
    id: "ot" + o.id, label: (o.numero || "") + " — " + (o.cliente || ""), sub: "Orden de Trabajo",
    href: "/ordenes", icon: ClipboardList, color: "#0369A1",
  }))

  clientesEquipos.getAll().filter(e =>
    has(e.equipo) || has(e.empresa)
  ).slice(0, 2).forEach(e => res.push({
    id: "ce" + e.id, label: e.equipo || "", sub: "Terreno · " + (e.empresa || ""),
    href: "/clientes", icon: Users, color: "#059669",
  }))

  gastos.getAll().filter(g =>
    has(g.descripcion) || has(g.responsable)
  ).slice(0, 2).forEach(g => res.push({
    id: "g" + g.id, label: g.descripcion || "", sub: "Gasto · " + (g.responsable || "") + " · $" + (g.monto ?? 0).toLocaleString("es-CL"),
    href: "/gastos", icon: Receipt, color: "#2563eb",
  }))

  proveedores.getAll().filter(p =>
    has(p.nombre) || has(p.productos) || has(p.pais) || has(p.contacto)
  ).slice(0, 3).forEach(p => res.push({
    id: "p" + p.id, label: p.nombre || "", sub: "Proveedor · " + (p.pais || "") + (p.productos ? " · " + p.productos : ""),
    href: "/proveedores", icon: Building2, color: "#0891b2",
  }))

  informesEntrega.getAll().filter(i =>
    has(i.equipo) || has(i.cliente) || has(i.numero)
  ).slice(0, 2).forEach(i => res.push({
    id: "ie" + i.id, label: (i.numero || "") + " — " + (i.equipo || ""), sub: "Informe entrega · " + (i.cliente || ""),
    href: "/informes-entrega", icon: ClipboardCheck, color: "#059669",
  }))

  return res.slice(0, 8)
}

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [idx, setIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const r = buscar(query)
    setResults(r)
    setOpen(r.length > 0 && query.length > 1)
    setIdx(-1)
  }, [query])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOut)
    return () => document.removeEventListener("mousedown", onClickOut)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === "ArrowDown")  { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === "ArrowUp")    { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    if (e.key === "Enter" && idx >= 0) {
      e.preventDefault()
      router.push(results[idx].href)
      setQuery(""); setOpen(false)
    }
    if (e.key === "Escape") { setOpen(false); inputRef.current?.blur() }
  }

  function selectResult(r: Result) {
    router.push(r.href)
    setQuery(""); setOpen(false)
  }

  return (
    <div className="relative flex-1 max-w-sm hidden sm:block" ref={containerRef}>
      <Search
        size={13}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "rgba(255,255,255,0.30)" }}
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (results.length > 0) setOpen(true) }}
        placeholder="Buscar... (Ctrl+K)"
        className="w-full pl-8 pr-8 py-1.5 rounded-lg text-[13px] outline-none"
        style={{
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.85)",
          transition: "background 150ms, border-color 150ms",
        }}
        onMouseEnter={e => {
          ;(e.target as HTMLElement).style.background = "rgba(255,255,255,0.10)"
          ;(e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.18)"
        }}
        onMouseLeave={e => {
          if (document.activeElement !== e.target) {
            ;(e.target as HTMLElement).style.background = "rgba(255,255,255,0.07)"
            ;(e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)"
          }
        }}
      />
      {query && (
        <button
          onClick={() => { setQuery(""); setOpen(false) }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
          style={{ color: "rgba(255,255,255,0.35)", transition: "color 150ms" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#FFFFFF"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.35)"}
        >
          <X size={12} />
        </button>
      )}

      {/* Dropdown de resultados */}
      {open && (
        <div
          className="absolute left-0 right-0 top-full mt-2 rounded-xl overflow-hidden z-[60]"
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--ds-border)",
            boxShadow: "var(--shadow-dropdown)",
          }}
        >
          <div
            className="px-3 py-2"
            style={{ borderBottom: "1px solid var(--ds-border)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
              {results.length} resultado{results.length !== 1 ? "s" : ""} para "{query}"
            </span>
          </div>
          <div style={{ maxHeight: "320px", overflowY: "auto" }}>
            {results.map((r, i) => {
              const Icon = r.icon
              const active = i === idx
              return (
                <button
                  key={r.id}
                  onClick={() => selectResult(r)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                  style={{
                    background: active ? "var(--ds-muted)" : "transparent",
                    borderBottom: "1px solid var(--ds-border)",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--ds-muted)"}
                  onMouseLeave={e => {
                    if (i !== idx) (e.currentTarget as HTMLElement).style.background = "transparent"
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: r.color + "15" }}
                  >
                    <Icon size={13} style={{ color: r.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate" style={{ color: "var(--ds-fg)" }}>{r.label}</div>
                    <div className="text-[11px] truncate" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>{r.sub}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
