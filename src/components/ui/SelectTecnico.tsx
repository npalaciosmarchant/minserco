"use client"

import { useEffect, useState } from "react"
import { usuarios } from "@/lib/store"
import { getSupabase } from "@/lib/supabase"
import { RolUsuario } from "@/lib/types"

export function SelectTecnico({ value, onChange, rol = "tecnico", placeholder }: { value: string; onChange: (v: string) => void; rol?: RolUsuario; placeholder?: string }) {
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string }[]>([])
  useEffect(() => {
    const local = usuarios.getAll()
    if (local.length > 0) setTecnicos(local.filter(u => u.rol === rol).map(u => ({ id: u.id, nombre: u.nombre })))
    else {
      (async () => {
        try {
          const { data } = await getSupabase().from("usuarios").select("id,nombre,rol")
          if (data) setTecnicos(data.filter((u: { rol: string }) => u.rol === rol).map((u: { id: string; nombre: string }) => ({ id: u.id, nombre: u.nombre })))
        } catch { /* offline */ }
      })()
    }
  }, [rol])
  const cls = "w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
  if (tecnicos.length === 0) {
    return <input value={value} onChange={e => onChange(e.target.value)} placeholder="Nombre del técnico" className={cls} />
  }
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
      <option value="">{placeholder ?? "Seleccionar…"}</option>
      {tecnicos.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
      {value && !tecnicos.some(t => t.nombre === value) && <option value={value}>{value}</option>}
    </select>
  )
}
