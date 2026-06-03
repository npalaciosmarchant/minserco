"use client"

import { useEffect, useState, useMemo } from "react"
import { clientesEquipos } from "@/lib/store"
import { ClienteEquipo } from "@/lib/types"
import { MapPin, Users, Wrench, CheckCircle2, Clock, AlertTriangle } from "lucide-react"

// Ciudad coordinates as % within Chile SVG (approximate positions on a stylized map)
const CIUDADES_CONFIG: Record<string, {
  label: string
  x: number  // % of SVG width
  y: number  // % of SVG height
  color: string
}> = {
  "Copiapó":     { label: "Copiapó",     x: 35, y: 22, color: "#f59e0b" },
  "La Serena":   { label: "La Serena",   x: 32, y: 36, color: "#60a5fa" },
  "Viña del Mar":{ label: "Viña del Mar",x: 28, y: 54, color: "#7c3aed" },
  "Otra":        { label: "Otra ciudad", x: 52, y: 70, color: "#94a3b8" },
}

// Simplified Chile outline as SVG path (stylized, proportional)
const CHILE_PATH = `
  M 55,2 C 52,4 50,8 48,12 L 45,18 C 42,22 40,26 38,30
  L 36,34 C 34,38 32,42 30,46 L 28,50 C 26,54 25,58 24,62
  L 23,66 C 22,70 21,74 22,78 L 23,82 C 24,86 25,90 26,94
  L 27,98 C 28,100 30,102 32,103 L 35,104 C 38,104 40,103 42,101
  L 44,98 C 46,95 47,91 48,87 L 50,83 C 52,79 53,75 54,71
  L 55,67 C 56,63 57,59 57,55 L 57,51 C 57,47 56,43 55,39
  L 54,35 C 53,31 53,27 53,23 L 53,19 C 53,15 54,11 55,7 Z
`

const ESTADO_COLORES: Record<string, string> = {
  activo: "#2dd4bf",
  inactivo: "#94a3b8",
  en_servicio: "#fbbf24",
}

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  en_servicio: "En servicio",
}

function diasHasta(fecha: string): number | null {
  if (!fecha) return null
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000)
}

export default function MapaPage() {
  const [equipos, setEquipos] = useState<ClienteEquipo[]>([])
  const [selectedCiudad, setSelectedCiudad] = useState<string | null>(null)
  const [hoveredCiudad, setHoveredCiudad] = useState<string | null>(null)

  useEffect(() => {
    setEquipos(clientesEquipos.getAll())
  }, [])

  const porCiudad = useMemo(() => {
    const map: Record<string, ClienteEquipo[]> = {}
    for (const ciudad of Object.keys(CIUDADES_CONFIG)) map[ciudad] = []
    equipos.forEach(e => {
      if (map[e.ciudad]) map[e.ciudad].push(e)
      else map["Otra"].push(e)
    })
    return map
  }, [equipos])

  const ciudadActiva = selectedCiudad || hoveredCiudad
  const equiposCiudad = ciudadActiva ? (porCiudad[ciudadActiva] ?? []) : []

  const totalEquipos = equipos.length
  const totalActivos = equipos.filter(e => e.estado === "activo").length
  const totalEnServicio = equipos.filter(e => e.estado === "en_servicio").length
  const conGarantiaVencida = equipos.filter(e => {
    const d = diasHasta(e.garantiaHasta ?? "")
    return d !== null && d < 0
  }).length

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>Mapa de Equipos</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          Distribución geográfica de equipos instalados en terreno
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total equipos", value: totalEquipos, color: "#f59e0b", icon: MapPin },
          { label: "Activos", value: totalActivos, color: "#0891b2", icon: CheckCircle2 },
          { label: "En servicio", value: totalEnServicio, color: "#fbbf24", icon: Wrench },
          { label: "Garantía vencida", value: conGarantiaVencida, color: "#f87171", icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{label}</span>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}>
                <Icon size={13} style={{ color }} />
              </div>
            </div>
            <span className="text-2xl font-bold" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map SVG */}
        <div className="lg:col-span-2 rounded-xl p-4 relative" style={{ background: "var(--card)", border: "1px solid var(--border)", minHeight: "480px" }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>
            Chile — Zonas de operación Minserco
          </h2>
          <div className="relative" style={{ height: "420px" }}>
            <svg
              viewBox="0 0 110 108"
              width="100%"
              height="100%"
              style={{ position: "absolute", inset: 0 }}
            >
              {/* Ocean background */}
              <rect x="0" y="0" width="110" height="108" fill="oklch(0.18 0.015 220)" rx="8" />

              {/* Chile body */}
              <path
                d={CHILE_PATH}
                fill="oklch(0.26 0.02 150)"
                stroke="oklch(0.35 0.02 150)"
                strokeWidth="0.5"
              />

              {/* Region labels */}
              <text x="66" y="22" fontSize="3.5" fill="oklch(0.5 0 0)" textAnchor="middle">Atacama</text>
              <text x="64" y="36" fontSize="3.5" fill="oklch(0.5 0 0)" textAnchor="middle">Coquimbo</text>
              <text x="18" y="54" fontSize="3.5" fill="oklch(0.5 0 0)" textAnchor="middle">Valparaíso</text>

              {/* City pins */}
              {Object.entries(CIUDADES_CONFIG).map(([ciudad, cfg]) => {
                const count = porCiudad[ciudad]?.length ?? 0
                const isActive = ciudadActiva === ciudad
                const radius = Math.max(4, Math.min(9, 4 + count * 0.8))
                return (
                  <g
                    key={ciudad}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedCiudad(selectedCiudad === ciudad ? null : ciudad)}
                    onMouseEnter={() => setHoveredCiudad(ciudad)}
                    onMouseLeave={() => setHoveredCiudad(null)}
                  >
                    {/* Pulse ring */}
                    {count > 0 && (
                      <circle
                        cx={cfg.x}
                        cy={cfg.y}
                        r={radius + 3}
                        fill="none"
                        stroke={cfg.color}
                        strokeWidth="0.5"
                        opacity={isActive ? 0.6 : 0.25}
                      />
                    )}
                    {/* Main dot */}
                    <circle
                      cx={cfg.x}
                      cy={cfg.y}
                      r={radius}
                      fill={cfg.color}
                      opacity={isActive ? 1 : count > 0 ? 0.8 : 0.3}
                      stroke={isActive ? "white" : "none"}
                      strokeWidth={isActive ? 0.8 : 0}
                    />
                    {/* Count */}
                    {count > 0 && (
                      <text
                        x={cfg.x}
                        y={cfg.y + 1.2}
                        textAnchor="middle"
                        fontSize="3.5"
                        fontWeight="bold"
                        fill="white"
                      >
                        {count}
                      </text>
                    )}
                    {/* Label */}
                    <text
                      x={cfg.x + radius + 2}
                      y={cfg.y + 1.2}
                      fontSize="3.5"
                      fill={isActive ? cfg.color : "oklch(0.65 0 0)"}
                      fontWeight={isActive ? "bold" : "normal"}
                    >
                      {cfg.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2">
            {Object.entries(CIUDADES_CONFIG).map(([ciudad, cfg]) => (
              <button
                key={ciudad}
                onClick={() => setSelectedCiudad(selectedCiudad === ciudad ? null : ciudad)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all"
                style={{
                  background: selectedCiudad === ciudad ? cfg.color + "25" : "var(--accent)",
                  border: `1px solid ${selectedCiudad === ciudad ? cfg.color + "60" : "transparent"}`,
                  color: selectedCiudad === ciudad ? cfg.color : "var(--muted-foreground)",
                }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                {cfg.label}
                <span className="font-bold">({porCiudad[ciudad]?.length ?? 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        <div className="rounded-xl p-4 flex flex-col gap-3 overflow-y-auto" style={{ background: "var(--card)", border: "1px solid var(--border)", maxHeight: "580px" }}>
          {ciudadActiva ? (
            <>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: CIUDADES_CONFIG[ciudadActiva]?.color }} />
                <h3 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{ciudadActiva}</h3>
                <span className="text-xs ml-auto" style={{ color: "var(--muted-foreground)" }}>
                  {equiposCiudad.length} equipo{equiposCiudad.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Estado resumen */}
              <div className="grid grid-cols-3 gap-1.5">
                {["activo", "en_servicio", "inactivo"].map(estado => {
                  const count = equiposCiudad.filter(e => e.estado === estado).length
                  return (
                    <div key={estado} className="rounded-lg p-2 text-center"
                      style={{ background: ESTADO_COLORES[estado] + "15" }}>
                      <div className="text-base font-bold" style={{ color: ESTADO_COLORES[estado] }}>{count}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)", fontSize: "9px" }}>{ESTADO_LABELS[estado]}</div>
                    </div>
                  )
                })}
              </div>

              {equiposCiudad.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--muted-foreground)" }}>
                  Sin equipos registrados en esta ciudad
                </p>
              ) : (
                <div className="space-y-2">
                  {equiposCiudad.map(eq => {
                    const estadoColor = ESTADO_COLORES[eq.estado] ?? "#94a3b8"
                    const diasGar = diasHasta(eq.garantiaHasta ?? "")
                    const garAlert = diasGar !== null && diasGar < 0
                    return (
                      <div key={eq.id} className="rounded-lg p-3"
                        style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: "var(--foreground)" }}>
                              {eq.equipo}
                            </p>
                            <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                              {eq.cliente}{eq.empresa ? ` — ${eq.empresa}` : ""}
                            </p>
                            {eq.codigoEquipo && (
                              <p className="text-xs" style={{ color: "oklch(0.5 0 0)", fontSize: "9px" }}>
                                {eq.codigoEquipo}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: estadoColor + "20", color: estadoColor }}>
                              {ESTADO_LABELS[eq.estado]}
                            </span>
                            {garAlert && (
                              <span className="flex items-center gap-1 text-xs" style={{ color: "#f87171", fontSize: "9px" }}>
                                <AlertTriangle size={9} />Garantía vencida
                              </span>
                            )}
                          </div>
                        </div>
                        {eq.proximaMantencion && (
                          <p className="text-xs mt-1.5" style={{ color: "var(--muted-foreground)", fontSize: "9px" }}>
                            Próx. mant.: {eq.proximaMantencion}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Resumen por ciudad</h3>
              <div className="space-y-2">
                {Object.entries(CIUDADES_CONFIG).map(([ciudad, cfg]) => {
                  const count = porCiudad[ciudad]?.length ?? 0
                  const activos = porCiudad[ciudad]?.filter(e => e.estado === "activo").length ?? 0
                  return (
                    <button
                      key={ciudad}
                      onClick={() => setSelectedCiudad(ciudad)}
                      className="w-full rounded-lg p-3 text-left transition-all hover:scale-[1.01]"
                      style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cfg.color }} />
                        <span className="text-sm font-medium flex-1" style={{ color: "var(--foreground)" }}>{cfg.label}</span>
                        <span className="text-base font-bold" style={{ color: cfg.color }}>{count}</span>
                      </div>
                      {count > 0 && (
                        <div className="flex gap-3 mt-1.5 ml-5">
                          <span className="text-xs" style={{ color: "#0891b2" }}>{activos} activos</span>
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{count - activos} otros</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                Haz clic en una ciudad para ver sus equipos
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
