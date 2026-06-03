"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "@/lib/supabase"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"

const MODULOS = [
  { id: "reparaciones", nombre: "Reparaciones" },
  { id: "gastos", nombre: "Gastos" },
  { id: "informes", nombre: "Informes" },
  { id: "ordenes", nombre: "Órdenes" },
  { id: "bodega", nombre: "Bodega" },
  { id: "tecnicos", nombre: "Técnicos" },
  { id: "clientes", nombre: "Clientes" },
  { id: "proveedores", nombre: "Proveedores" },
  { id: "cotizaciones", nombre: "Cotizaciones" },
  { id: "mantenciones", nombre: "Mantenciones" },
  { id: "arriendo", nombre: "Arriendo" },
  { id: "importaciones", nombre: "Importaciones" },
  { id: "fabricacion", nombre: "Fabricación" },
  { id: "reportes", nombre: "Reportes" },
  { id: "calendario", nombre: "Calendario" },
  { id: "checklist", nombre: "Checklist" },
  { id: "mapa", nombre: "Mapa" },
  { id: "actividad", nombre: "Actividad" },
]

interface PermisoItem {
  modulo_id: string
  puede_ver: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
}

export function PermisosForm({ tecnicoId }: { tecnicoId: string }) {
  const [permisos, setPermisos] = useState<Map<string, PermisoItem>>(new Map())
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarPermisos()
  }, [tecnicoId])

  const cargarPermisos = async () => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from("tecnico_permisos")
      .select("*")
      .eq("tecnico_id", tecnicoId)

    const map = new Map<string, PermisoItem>()
    data?.forEach(p => {
      map.set(p.modulo_id, {
        modulo_id: p.modulo_id,
        puede_ver: p.puede_ver,
        puede_crear: p.puede_crear,
        puede_editar: p.puede_editar,
        puede_eliminar: p.puede_eliminar,
      })
    })

    // Inicializar módulos sin permisos asignados
    MODULOS.forEach(m => {
      if (!map.has(m.id)) {
        map.set(m.id, {
          modulo_id: m.id,
          puede_ver: true,
          puede_crear: true,
          puede_editar: true,
          puede_eliminar: false,
        })
      }
    })

    setPermisos(map)
    setCargando(false)
  }

  const actualizar = async (modulo: string, campo: keyof Omit<PermisoItem, "modulo_id">, valor: boolean) => {
    const permisoActual = permisos.get(modulo)
    if (!permisoActual) return

    const actualizado = { ...permisoActual, [campo]: valor }
    const nuevosMapa = new Map(permisos)
    nuevosMapa.set(modulo, actualizado)
    setPermisos(nuevosMapa)

    // Guardar en BD
    const supabase = getSupabase()
    await supabase
      .from("tecnico_permisos")
      .upsert({
        tecnico_id: tecnicoId,
        modulo_id: modulo,
        puede_ver: actualizado.puede_ver,
        puede_crear: actualizado.puede_crear,
        puede_editar: actualizado.puede_editar,
        puede_eliminar: actualizado.puede_eliminar,
      })
  }

  if (cargando) return <div className="text-sm text-gray-500">Cargando permisos...</div>

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Permisos por módulo</h3>
      <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
        {MODULOS.map(modulo => {
          const p = permisos.get(modulo.id)
          if (!p) return null

          return (
            <Card key={modulo.id} className="p-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium w-32">{modulo.nombre}</span>
                <div className="flex gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.puede_ver}
                      onChange={e => actualizar(modulo.id, "puede_ver", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Ver</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.puede_crear}
                      onChange={e => actualizar(modulo.id, "puede_crear", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Crear</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.puede_editar}
                      onChange={e => actualizar(modulo.id, "puede_editar", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Editar</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.puede_eliminar}
                      onChange={e => actualizar(modulo.id, "puede_eliminar", e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Eliminar</span>
                  </label>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
