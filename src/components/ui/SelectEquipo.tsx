"use client"

import { useEffect, useState } from "react"
import { equipos as equiposStore } from "@/lib/store"
import { Equipo } from "@/lib/types"

export function SelectEquipo({ value, onChange, onSelectEquipo, placeholder = "Seleccionar equipo…" }: {
  value: string
  onChange: (v: string) => void
  onSelectEquipo?: (equipo: Equipo | null) => void
  placeholder?: string
}) {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  useEffect(() => { setEquipos(equiposStore.getAll()) }, [])
  const cls = "w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"

  function handle(v: string) {
    onChange(v)
    if (onSelectEquipo) onSelectEquipo(equipos.find(e => e.nombre === v) ?? null)
  }

  if (equipos.length === 0) {
    return <input value={value} onChange={e => onChange(e.target.value)} placeholder="Registra equipos en el menú Equipos" className={cls} />
  }
  return (
    <select value={value} onChange={e => handle(e.target.value)} className={cls}>
      <option value="">{placeholder}</option>
      {equipos.map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
      {value && !equipos.some(e => e.nombre === value) && <option value={value}>{value}</option>}
    </select>
  )
}
