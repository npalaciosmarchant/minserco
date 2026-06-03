"use client"

import { useEffect, useRef } from "react"
import { alertasConfig, gastos, informesEntrega, mantenciones, ordenesTrabajo } from "./store"

export interface AlertaScheduled {
  id: string
  titulo: string
  detalle: string
  tipo: "recordatorio"
  urgente: boolean
}

type AlertCallback = (alertas: AlertaScheduled[]) => void

export function useAlertScheduler(onAlert: AlertCallback) {
  const lastCheck = useRef<string>("")

  useEffect(() => {
    function check() {
      const ahora = new Date()
      const horaActual = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`
      const hoy = ahora.toISOString().slice(0, 10)
      const diaSemana = ahora.getDay() // 0=Dom

      // Evitar disparar dos veces en el mismo minuto
      if (lastCheck.current === `${hoy}-${horaActual}`) return
      lastCheck.current = `${hoy}-${horaActual}`

      const configs = alertasConfig.getAll()
      const nuevasAlertas: AlertaScheduled[] = []

      for (const cfg of configs) {
        if (!cfg.activa) continue
        if (!cfg.diasSemana.includes(diaSemana)) continue
        if (cfg.hora !== horaActual) continue
        if (cfg.ultimaDisparo === hoy) continue

        // Disparar alerta
        alertasConfig.marcarDisparado(cfg.id)

        if (cfg.tipo === "fin_jornada") {
          const gastosP = gastos.getAll().filter(g => g.estado === "borrador" || g.estado === "enviado").length
          const informesP = informesEntrega.getAll().filter(i => i.estado === "borrador").length
          const otsP = ordenesTrabajo.getAll().filter(o => o.estado === "pendiente" || o.estado === "en_curso").length

          const detalles: string[] = []
          if (gastosP > 0) detalles.push(`${gastosP} gasto(s) sin aprobar`)
          if (informesP > 0) detalles.push(`${informesP} informe(s) sin emitir`)
          if (otsP > 0) detalles.push(`${otsP} OT(s) activa(s)`)

          nuevasAlertas.push({
            id: `sched-${cfg.id}-${hoy}`,
            titulo: "⏰ Fin de jornada",
            detalle: detalles.length > 0 ? detalles.join(" · ") : "Todo al día, ¡buen trabajo!",
            tipo: "recordatorio",
            urgente: detalles.length > 0,
          })
        }

        if (cfg.tipo === "recordatorio_gastos") {
          const pendientes = gastos.getAll().filter(g => g.estado === "borrador").length
          if (pendientes > 0) {
            nuevasAlertas.push({
              id: `sched-${cfg.id}-${hoy}`,
              titulo: "💰 Rendición de gastos pendiente",
              detalle: `${pendientes} gasto(s) en borrador por enviar`,
              tipo: "recordatorio",
              urgente: true,
            })
          }
        }

        if (cfg.tipo === "recordatorio_informes") {
          const pendientes = informesEntrega.getAll().filter(i => i.estado === "borrador").length
          if (pendientes > 0) {
            nuevasAlertas.push({
              id: `sched-${cfg.id}-${hoy}`,
              titulo: "📋 Informes de entrega pendientes",
              detalle: `${pendientes} informe(s) sin emitir`,
              tipo: "recordatorio",
              urgente: false,
            })
          }
        }

        if (cfg.tipo === "recordatorio_ots") {
          const vencidas = ordenesTrabajo.getAll().filter(o => {
            if (o.estado !== "pendiente" && o.estado !== "en_curso") return false
            if (!o.fechaTermino) return false
            return o.fechaTermino < hoy
          }).length
          if (vencidas > 0) {
            nuevasAlertas.push({
              id: `sched-${cfg.id}-${hoy}`,
              titulo: "🔧 OTs vencidas",
              detalle: `${vencidas} orden(es) de trabajo con fecha vencida`,
              tipo: "recordatorio",
              urgente: true,
            })
          }
        }
      }

      // Verificar OTs con fecha límite próxima (1 día)
      const manana = new Date(ahora)
      manana.setDate(manana.getDate() + 1)
      const mananaStr = manana.toISOString().slice(0, 10)
      const otsPorVencer = ordenesTrabajo.getAll().filter(o =>
        (o.estado === "pendiente" || o.estado === "en_curso") &&
        o.fechaTermino === mananaStr
      )
      if (otsPorVencer.length > 0 && horaActual === "09:00") {
        nuevasAlertas.push({
          id: `ot-vence-${hoy}`,
          titulo: "⚠️ OTs vencen mañana",
          detalle: otsPorVencer.map(o => o.numero).join(", "),
          tipo: "recordatorio",
          urgente: true,
        })
      }

      // Mantenciones vencidas (proxima fecha < hoy)
      const mantVencidas = mantenciones.getAll().filter(m =>
        m.estado === "pendiente" &&
        m.proximaMantencion &&
        m.proximaMantencion <= hoy
      )
      if (mantVencidas.length > 0 && horaActual === "08:00") {
        nuevasAlertas.push({
          id: `mant-venc-${hoy}`,
          titulo: "🔩 Mantenciones vencidas",
          detalle: `${mantVencidas.length} equipo(s) con mantención pendiente`,
          tipo: "recordatorio",
          urgente: true,
        })
      }

      if (nuevasAlertas.length > 0) {
        onAlert(nuevasAlertas)
      }
    }

    // Check inmediato + cada 60 segundos
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [onAlert])
}
