import { getSupabase } from "./supabase"

export interface ResultadoBusqueda {
  tipo: string
  id: string
  titulo: string
  descripcion: string
  url: string
}

export async function buscarGlobal(query: string): Promise<ResultadoBusqueda[]> {
  if (!query || query.length < 2) return []

  const supabase = getSupabase()
  const q = query.toLowerCase()
  const resultados: ResultadoBusqueda[] = []

  try {
    // Reparaciones
    const { data: reparaciones } = await supabase
      .from("reparaciones")
      .select("id,equipo,cliente,estado")
      .or(`equipo.ilike.%${q}%,cliente.ilike.%${q}%,numero_serie.ilike.%${q}%`)
      .limit(10)

    reparaciones?.forEach(r => {
      resultados.push({
        tipo: "Reparación",
        id: r.id,
        titulo: `${r.equipo} - ${r.cliente}`,
        descripcion: `Estado: ${r.estado}`,
        url: `/reparacion?id=${r.id}`,
      })
    })

    // Clientes
    const { data: clientes } = await supabase
      .from("clientes_equipos")
      .select("id,cliente,empresa,equipo")
      .or(`cliente.ilike.%${q}%,empresa.ilike.%${q}%`)
      .limit(10)

    clientes?.forEach(c => {
      resultados.push({
        tipo: "Cliente",
        id: c.id,
        titulo: c.cliente,
        descripcion: c.empresa || "",
        url: `/clientes?id=${c.id}`,
      })
    })

    // Técnicos
    const { data: tecnicos } = await supabase
      .from("tecnicos")
      .select("id,nombre,especialidad")
      .ilike("nombre", `%${q}%`)
      .limit(10)

    tecnicos?.forEach(t => {
      resultados.push({
        tipo: "Técnico",
        id: t.id,
        titulo: t.nombre,
        descripcion: t.especialidad || "",
        url: `/tecnicos?id=${t.id}`,
      })
    })

    // Órdenes
    const { data: ordenes } = await supabase
      .from("ordenes_trabajo")
      .select("id,numero,cliente,tipo")
      .or(`numero.ilike.%${q}%,cliente.ilike.%${q}%`)
      .limit(10)

    ordenes?.forEach(o => {
      resultados.push({
        tipo: "Orden",
        id: o.id,
        titulo: `${o.numero} - ${o.cliente}`,
        descripcion: o.tipo,
        url: `/ordenes?id=${o.id}`,
      })
    })

    return resultados.slice(0, 20)
  } catch (error) {
    console.error("Error en búsqueda global:", error)
    return []
  }
}
