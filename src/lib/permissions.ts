import { getSupabase } from "./supabase"

export type Modulo =
  | "reparaciones" | "gastos" | "informes" | "ordenes" | "bodega"
  | "tecnicos" | "clientes" | "proveedores" | "cotizaciones" | "mantenciones"
  | "arriendo" | "importaciones" | "fabricacion" | "reportes" | "calendario"
  | "checklist" | "mapa" | "actividad"
  | "documentos" | "reuniones" | "visitas" | "licitaciones"
  | "nodos" | "tareas"

export interface Permiso {
  modulo_id: Modulo
  puede_ver: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
}

interface PermisoCache {
  permisos: Map<string, Permiso>
  timestamp: number
}

let _cache: PermisoCache = { permisos: new Map(), timestamp: 0 }
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

export async function obtenerPermisosTecnico(
  tecnicoId?: string
): Promise<Map<Modulo, Permiso>> {
  const now = Date.now()

  // Retornar cache si es válido
  if (now - _cache.timestamp < CACHE_DURATION && _cache.permisos.size > 0) {
    return _cache.permisos as Map<Modulo, Permiso>
  }

  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from("tecnico_permisos")
      .select("modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar")
      .eq("tecnico_id", tecnicoId || (await supabase.auth.getUser()).data.user?.id || "")

    if (error) throw error

    const permisos = new Map<Modulo, Permiso>()
    data?.forEach(p => {
      permisos.set(p.modulo_id as Modulo, {
        modulo_id: p.modulo_id as Modulo,
        puede_ver: p.puede_ver,
        puede_crear: p.puede_crear,
        puede_editar: p.puede_editar,
        puede_eliminar: p.puede_eliminar,
      })
    })

    _cache = { permisos, timestamp: now }
    return permisos
  } catch (err) {
    console.error("Error obteniendo permisos:", err)
    return new Map()
  }
}

export function puedoVer(modulo: Modulo, permisos: Map<Modulo, Permiso>): boolean {
  return permisos.get(modulo)?.puede_ver ?? true
}

export function puedoCrear(modulo: Modulo, permisos: Map<Modulo, Permiso>): boolean {
  return permisos.get(modulo)?.puede_crear ?? true
}

export function puedoEditar(modulo: Modulo, permisos: Map<Modulo, Permiso>): boolean {
  return permisos.get(modulo)?.puede_editar ?? true
}

export function puedoEliminar(modulo: Modulo, permisos: Map<Modulo, Permiso>): boolean {
  return permisos.get(modulo)?.puede_eliminar ?? false
}

export function limpiarCache() {
  _cache = { permisos: new Map(), timestamp: 0 }
}
