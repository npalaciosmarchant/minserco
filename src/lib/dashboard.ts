import { getSupabase } from "./supabase"

export interface MetricasDashboard {
  totalReparaciones: number
  reparacionesVencidas: number
  reparacionesEnCurso: number
  gastosTotal: number
  gastosEsteMes: number
  equiposEnServicio: number
  tecnicosActivos: number
  productividadPorTecnico: { tecnico: string; reparaciones: number; gastos: number }[]
  ingresoVsGastos: { mes: string; ingresos: number; gastos: number }[]
}

export async function obtenerMetricas(): Promise<MetricasDashboard> {
  const supabase = getSupabase()
  const hoy = new Date().toISOString().split("T")[0]

  try {
    // Total y estado de reparaciones
    const { data: reparaciones } = await supabase
      .from("reparaciones")
      .select("id,estado,fecha_estimada,costo_final,tecnico")

    const reparacionesVencidas = reparaciones?.filter(
      r => r.fecha_estimada && r.fecha_estimada < hoy && !["entregado", "listo"].includes(r.estado)
    ).length || 0

    const reparacionesEnCurso = reparaciones?.filter(r => r.estado === "en_reparacion").length || 0

    // Gastos
    const { data: gastos } = await supabase.from("gastos").select("monto,fecha,responsable")

    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      .toISOString()
      .split("T")[0]

    const gastosEsteMes = gastos
      ?.filter(g => g.fecha >= inicioMes)
      .reduce((sum, g) => sum + (Number(g.monto) || 0), 0) || 0

    const gastosTotal =
      gastos?.reduce((sum, g) => sum + (Number(g.monto) || 0), 0) || 0

    // Equipos y técnicos
    const { data: equipos } = await supabase
      .from("clientes_equipos")
      .select("id,estado")

    const { data: tecnicos } = await supabase
      .from("tecnicos")
      .select("id,nombre,activo")
      .eq("activo", true)

    // Productividad por técnico
    const productividadPorTecnico = (tecnicos || []).map(t => {
      const repDelTecnico = reparaciones?.filter(r => r.tecnico === t.nombre).length || 0
      const gastosDelTecnico =
        gastos?.filter(g => g.responsable === t.nombre).reduce((sum, g) => sum + (Number(g.monto) || 0), 0) || 0
      return {
        tecnico: t.nombre,
        reparaciones: repDelTecnico,
        gastos: gastosDelTecnico,
      }
    })

    // Ingresos vs gastos por mes (últimos 6 meses)
    const ingresoVsGastos = []
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date()
      fecha.setMonth(fecha.getMonth() - i)
      const mes = fecha.toLocaleString("es-CL", { month: "short", year: "2-digit" })
      const inicioMesFecha = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
        .toISOString()
        .split("T")[0]
      const finMesFecha = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0]

      const ingresos =
        reparaciones
          ?.filter(r => r.costo_final && r.fecha_estimada && r.fecha_estimada >= inicioMesFecha && r.fecha_estimada <= finMesFecha)
          .reduce((sum, r) => sum + (Number(r.costo_final) || 0), 0) || 0

      const gastosMes =
        gastos?.filter(g => g.fecha >= inicioMesFecha && g.fecha <= finMesFecha).reduce((sum, g) => sum + (Number(g.monto) || 0), 0) || 0

      ingresoVsGastos.push({ mes, ingresos, gastos: gastosMes })
    }

    return {
      totalReparaciones: reparaciones?.length || 0,
      reparacionesVencidas,
      reparacionesEnCurso,
      gastosTotal,
      gastosEsteMes,
      equiposEnServicio: equipos?.filter(e => e.estado === "activo").length || 0,
      tecnicosActivos: tecnicos?.length || 0,
      productividadPorTecnico,
      ingresoVsGastos,
    }
  } catch (error) {
    console.error("Error obteniendo métricas:", error)
    return {
      totalReparaciones: 0,
      reparacionesVencidas: 0,
      reparacionesEnCurso: 0,
      gastosTotal: 0,
      gastosEsteMes: 0,
      equiposEnServicio: 0,
      tecnicosActivos: 0,
      productividadPorTecnico: [],
      ingresoVsGastos: [],
    }
  }
}
