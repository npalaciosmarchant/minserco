"use client"

import { useEffect, useState } from "react"
import { equipos as equiposStore } from "@/lib/store"

export function SelectEquipo({ value, onChange, placeholder = "Seleccionar equipo…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [nombres, setNombres] = useState<string[]>([])
  useEffect(() => { setNombres(equiposStore.getAll().map(e => e.nombre)) }, [])
  const cls = "w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
  if (nombres.length === 0) {
    return <input value={value} onChange={e => onChange(e.target.value)} placeholder="Registra equipos en el menú Equipos" className={cls} />
  }
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
      <option value="">{placeholder}</option>
      {nombres.map(n => <option key={n} value={n}>{n}</option>)}
      {value && !nombres.includes(value) && <option value={value}>{value}</option>}
    </select>
  )
}
