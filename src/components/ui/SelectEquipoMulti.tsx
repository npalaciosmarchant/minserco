"use client"

import { useEffect, useRef, useState } from "react"
import { equipos as equiposStore } from "@/lib/store"
import { Equipo } from "@/lib/types"
import { Miniatura } from "./SelectEquipo"
import { ChevronDown, Search } from "lucide-react"

// Selector múltiple de equipos del catálogo (muestra la foto de cada uno para
// diferenciar equipos con nombres repetidos). Entrega el registro completo del
// equipo elegido en `onPick`, para que quien lo use guarde su id (vínculo por
// ID) además del nombre. `excludeIds` oculta los equipos ya seleccionados.
export function SelectEquipoMulti({ excludeIds, onPick, placeholder = "Agregar equipo…" }: {
  excludeIds: string[]
  onPick: (equipo: Equipo) => void
  placeholder?: string
}) {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setEquipos(equiposStore.getAll()) }, [])

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  if (equipos.length === 0) return null

  const q = busqueda.trim().toLowerCase()
  const disponibles = equipos.filter(e => !excludeIds.includes(e.id))
  const filtrados = q
    ? disponibles.filter(e => e.nombre.toLowerCase().includes(q) || (e.numeroSerie ?? "").toLowerCase().includes(q))
    : disponibles

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none flex items-center gap-2 text-gray-400"
      >
        <span className="flex-1 text-left truncate">{placeholder}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute z-[60] mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5 px-2 h-8 rounded-lg bg-gray-50">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input
                autoFocus
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o N° serie…"
                className="flex-1 min-w-0 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtrados.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">Sin resultados</div>
            )}
            {filtrados.map(eq => (
              <button
                type="button"
                key={eq.id}
                onClick={() => { onPick(eq); setOpen(false); setBusqueda("") }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-gray-50 text-left"
              >
                <Miniatura equipo={eq} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">{eq.nombre}</span>
                  {(eq.numeroSerie || eq.marca || eq.modelo) && (
                    <span className="block text-xs text-gray-400 truncate">
                      {[eq.marca, eq.modelo].filter(Boolean).join(" ")}{eq.numeroSerie ? ` · S/N: ${eq.numeroSerie}` : ""}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
