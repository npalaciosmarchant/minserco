"use client"

import { useEffect, useState } from "react"
import { usuarios } from "@/lib/store"
import { getSupabase } from "@/lib/supabase"

export function SelectUsuario({ value, onChange, placeholder = "Seleccionar persona…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [users, setUsers] = useState<{ id: string; nombre: string }[]>([])
  useEffect(() => {
    const local = usuarios.getAll()
    if (local.length > 0) setUsers(local.map(u => ({ id: u.id, nombre: u.nombre })))
    else {
      (async () => {
        try {
          const { data } = await getSupabase().from("usuarios").select("id,nombre")
          if (data) setUsers(data.map((u: { id: string; nombre: string }) => ({ id: u.id, nombre: u.nombre })))
        } catch { /* offline */ }
      })()
    }
  }, [])
  const cls = "w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
  if (users.length === 0) {
    return <input value={value} onChange={e => onChange(e.target.value)} placeholder="Nombre" className={cls} />
  }
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
      <option value="">{placeholder}</option>
      {users.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
      {value && !users.some(u => u.nombre === value) && <option value={value}>{value}</option>}
    </select>
  )
}
