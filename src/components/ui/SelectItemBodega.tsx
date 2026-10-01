"use client"

import { useEffect, useRef, useState } from "react"
import { ItemBodega } from "@/lib/types"
import { ChevronDown, Search, X, Package } from "lucide-react"

// Selector de ítems de Bodega: lista ordenada alfabéticamente (A-Z) con un
// buscador opcional para encontrar más rápido el ítem (por nombre o código).
// `value` es el id del ítem de bodega (o "" si no está vinculado a bodega).
export function SelectItemBodega({ items, value, onPick, placeholder = "Sin vincular a bodega — ítem nuevo/externo" }: {
  items: ItemBodega[]
  value: string
  onPick: (item: ItemBodega | null) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setBusqueda("") }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  const ordenados = items.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
  const q = busqueda.trim().toLowerCase()
  const filtrados = q
    ? ordenados.filter(i => i.nombre.toLowerCase().includes(q) || (i.codigo ?? "").toLowerCase().includes(q))
    : ordenados

  const seleccionado = items.find(i => i.id === value) ?? null

  function handle(item: ItemBodega | null) {
    onPick(item)
    setOpen(false)
    setBusqueda("")
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none flex items-center gap-2"
      >
        <span className={"flex-1 min-w-0 truncate text-left" + (seleccionado ? "" : " text-gray-400")}>
          {seleccionado ? `${seleccionado.nombre} (${seleccionado.cantidad} ${seleccionado.unidad} disp.)` : placeholder}
        </span>
        {seleccionado && (
          <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); handle(null) }} className="p-0.5 rounded hover:bg-gray-100 shrink-0">
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
                placeholder="Buscar en bodega… (opcional)"
                className="flex-1 min-w-0 bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handle(null)}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-gray-50 text-left text-gray-500"
            >
              <span className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 bg-gray-100 border border-gray-200">
                <Package size={14} className="text-gray-400" />
              </span>
              <span className="text-sm">Sin vincular a bodega — ítem nuevo/externo</span>
            </button>
            {filtrados.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">Sin resultados</div>
            )}
            {filtrados.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => handle(item)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-gray-50 text-left"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-900 truncate">{item.nombre}</span>
                  <span className="block text-xs text-gray-400 truncate">
                    {item.cantidad} {item.unidad} disp.{item.codigo ? ` · ${item.codigo}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
