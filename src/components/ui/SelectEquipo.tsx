"use client"

import { useEffect, useRef, useState } from "react"
import { equipos as equiposStore } from "@/lib/store"
import { Equipo } from "@/lib/types"
import { fotoSrc } from "@/lib/upload-foto"
import { Package, ChevronDown, Search, X } from "lucide-react"

export function Miniatura({ equipo, size = 28 }: { equipo?: Equipo | null; size?: number }) {
  if (equipo?.foto) {
    return (
      <img
        src={fotoSrc(equipo.foto)}
        alt=""
        className="rounded-md object-cover shrink-0 border border-gray-200"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-md flex items-center justify-center shrink-0 bg-gray-100 border border-gray-200"
      style={{ width: size, height: size }}
    >
      <Package size={Math.round(size * 0.55)} className="text-gray-400" />
    </div>
  )
}

// Selector de equipos que muestra la foto de cada uno para diferenciar equipos
// con nombres repetidos. `value`/`onChange` siguen trabajando con el NOMBRE del
// equipo (compatibilidad con el resto de la app); `onSelectEquipo` entrega el
// registro completo del catálogo (incluyendo su id) para que quien lo use pueda
// guardar además el equipoId y así vincular el registro al catálogo.
export function SelectEquipo({ value, onChange, onSelectEquipo, placeholder = "Seleccionar equipo…" }: {
  value: string
  onChange: (v: string) => void
  onSelectEquipo?: (equipo: Equipo | null) => void
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

  if (equipos.length === 0) {
    return <input value={value} onChange={e => onChange(e.target.value)} placeholder="Registra equipos en el menú Equipos" className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none" />
  }

  function handle(eq: Equipo | null) {
    onChange(eq ? eq.nombre : "")
    if (onSelectEquipo) onSelectEquipo(eq)
    setOpen(false)
    setBusqueda("")
  }

  const seleccionado = equipos.find(e => e.nombre === value) ?? null
  const q = busqueda.trim().toLowerCase()
  const filtrados = q
    ? equipos.filter(e => e.nombre.toLowerCase().includes(q) || (e.numeroSerie ?? "").toLowerCase().includes(q))
    : equipos

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-9 rounded-lg border border-input bg-transparent px-2 text-sm outline-none flex items-center gap-2"
      >
        {value ? <Miniatura equipo={seleccionado} size={22} /> : null}
        <span className={"flex-1 min-w-0 truncate text-left" + (value ? "" : " text-gray-400")}>
          {value || placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); handle(null) }}
            className="p-0.5 rounded hover:bg-gray-100 shrink-0"
          >
            <X size={13} className="text-gray-400" />
          </span>
        )}
        <ChevronDown size={14} className="text-gray-400 shrink-0" />
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
                onClick={() => handle(eq)}
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
            {value && !equipos.some(e => e.nombre === value) && (
              <button
                type="button"
                onClick={() => handle({ nombre: value } as Equipo)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-gray-50 text-left border-t border-gray-100"
              >
                <Miniatura equipo={null} />
                <span className="text-sm text-gray-600 truncate">{value} <span className="text-xs text-gray-400">(texto libre)</span></span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
