import { getSupabase } from "./supabase"

export interface Alerta {
  id: string
  tipo: "reparacion_vencida" | "equipo_mantencion" | "contrato_proximo_vencer"
  titulo: string
  descripcion: string
  urgencia: "alta" | "media" | "baja"
  fecha: Date
  lido: boolean
}

export async function obtenerAlertasVencidas(): Promise<Alerta[]> {
  const supabase = getSupabase()
  const hoy = new Date().toISOString().split("T")[0]
  const alertas: Alerta[] = []

  try {
    // Reparaciones vencidas
    const { data: reparacionesVencidas } = await supabase
      .from("reparaciones")
      .select("id,equipo,cliente,fecha_estimada,estado")
      .lt("fecha_estimada", hoy)
      .in("estado", ["recibido", "diagnostico", "en_reparacion", "esperando_repuestos"])

    reparacionesVencidas?.forEach(r => {
      const diasVencida = Math.floor(
        (new Date().getTime() - new Date(r.fecha_estimada).getTime()) / (1000 * 60 * 60 * 24)
      )
      alertas.push({
        id: `vencida-${r.id}`,
        tipo: "reparacion_vencida",
        titulo: `Reparación vencida: ${r.equipo}`,
        descripcion: `Hace ${diasVencida} días - ${r.cliente}`,
        urgencia: diasVencida > 7 ? "alta" : "media",
        fecha: new Date(r.fecha_estimada),
        lido: false,
      })
    })

    // Próximos vencimientos (equipos con mantenimiento próximo)
    const proximos7Dias = new Date()
    proximos7Dias.setDate(proximos7Dias.getDate() + 7)
    const proximos7DiasStr = proximos7Dias.toISOString().split("T")[0]

    const { data: mantenciones } = await supabase
      .from("clientes_equipos")
      .select("id,equipo,cliente,proxima_mantencion")
      .gte("proxima_mantencion", hoy)
      .lte("proxima_mantencion", proximos7DiasStr)

    mantenciones?.forEach(m => {
      alertas.push({
        id: `mantencion-${m.id}`,
        tipo: "equipo_mantencion",
        titulo: `Próxima mantencion: ${m.equipo}`,
        descripcion: `${m.cliente} - ${m.proxima_mantencion}`,
        urgencia: "media",
        fecha: new Date(m.proxima_mantencion),
        lido: false,
      })
    })

    // Contratos próximos a vencer
    const { data: contratos } = await supabase
      .from("contratos_arriendo")
      .select("id,equipo,cliente,fecha_termino")
      .gte("fecha_termino", hoy)
      .lte("fecha_termino", proximos7DiasStr)

    contratos?.forEach(c => {
      alertas.push({
        id: `contrato-${c.id}`,
        tipo: "contrato_proximo_vencer",
        titulo: `Contrato por vencer: ${c.equipo}`,
        descripcion: `${c.cliente} - ${c.fecha_termino}`,
        urgencia: "media",
        fecha: new Date(c.fecha_termino),
        lido: false,
      })
    })

    return alertas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
  } catch (error) {
    console.error("Error obteniendo alertas:", error)
    return []
  }
}

export async function enviarNotificacionTecnico(
  tecnicoId: string,
  titulo: string,
  mensaje: string
): Promise<boolean> {
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(titulo, {
        body: mensaje,
        icon: "/logo_minserco.png",
      })
      return true
    }
    return false
  } catch (error) {
    console.error("Error enviando notificación:", error)
    return false
  }
}
