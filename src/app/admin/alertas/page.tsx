"use client"

import { useEffect, useState } from "react"
import { alertasConfig } from "@/lib/store"
import { AlertaConfig, TipoAlertaConfig } from "@/lib/types"
import PageShell from "@/components/layout/PageShell"
import { Bell, Clock, Calendar, ToggleLeft, ToggleRight, Save } from "lucide-react"

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

const tipoInfo: Record<TipoAlertaConfig, { label: string; desc: string; color: string }> = {
  fin_jornada:          { label: "Fin de jornada",           desc: "Recordatorio al cerrar el día: gastos e informes pendientes", color: "#7C3AED" },
  recordatorio_gastos:  { label: "Rendición de gastos",      desc: "Aviso para enviar rendiciones pendientes",                    color: "#2563eb" },
  recordatorio_informes:{ label: "Informes de entrega",      desc: "Recordatorio de informes sin emitir",                         color: "#059669" },
  recordatorio_ots:     { label: "Órdenes de trabajo",       desc: "Alerta cuando hay OTs vencidas o por vencer",                 color: "#D97706" },
}

export default function AlertasConfigPage() {
  const [configs, setConfigs] = useState<AlertaConfig[]>([])
  const [guardado, setGuardado] = useState<string | null>(null)

  useEffect(() => { setConfigs(alertasConfig.getAll()) }, [])

  function toggle(id: string) {
    alertasConfig.update(id, { activa: !configs.find(c => c.id === id)?.activa })
    setConfigs(alertasConfig.getAll())
  }

  function setHora(id: string, hora: string) {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, hora } : c))
  }

  function toggleDia(id: string, dia: number) {
    setConfigs(prev => prev.map(c => {
      if (c.id !== id) return c
      const dias = c.diasSemana.includes(dia)
        ? c.diasSemana.filter(d => d !== dia)
        : [...c.diasSemana, dia].sort()
      return { ...c, diasSemana: dias }
    }))
  }

  function setMensaje(id: string, mensaje: string) {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, mensaje } : c))
  }

  function guardar(id: string) {
    const cfg = configs.find(c => c.id === id)
    if (!cfg) return
    alertasConfig.update(id, { hora: cfg.hora, diasSemana: cfg.diasSemana, mensaje: cfg.mensaje })
    setGuardado(id)
    setTimeout(() => setGuardado(null), 2000)
  }

  return (
    <PageShell
      icon={Bell}
      title="Configuración de Alertas"
      subtitle="Horarios y días de activación de alertas automáticas"
      color="#7C3AED"
    >
      <div className="space-y-4 max-w-2xl">
        {configs.map(cfg => {
          const info = tipoInfo[cfg.tipo] ?? { label: cfg.tipo, desc: "", color: "#64748b" }
          return (
            <div
              key={cfg.id}
              className="ds-card p-5"
              style={{ border: cfg.activa ? `1px solid ${info.color}30` : undefined, opacity: cfg.activa ? 1 : 0.7 }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: info.color + "18" }}
                  >
                    <Bell size={15} style={{ color: info.color }} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>{info.label}</div>
                    <div className="text-[12px] mt-0.5" style={{ color: "var(--ds-fg-subtle)" }}>{info.desc}</div>
                  </div>
                </div>
                <button
                  onClick={() => toggle(cfg.id)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
                  style={{
                    background: cfg.activa ? info.color + "18" : "var(--ds-muted)",
                    color: cfg.activa ? info.color : "var(--ds-fg-subtle)",
                    border: `1px solid ${cfg.activa ? info.color + "40" : "transparent"}`,
                  }}
                >
                  {cfg.activa ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                  {cfg.activa ? "Activa" : "Inactiva"}
                </button>
              </div>

              {cfg.activa && (
                <div className="space-y-4">
                  {/* Hora */}
                  <div className="flex items-center gap-3">
                    <Clock size={14} style={{ color: "var(--ds-fg-subtle)" }} />
                    <span className="text-[12px] font-medium w-16" style={{ color: "var(--ds-fg-muted)" }}>Hora</span>
                    <input
                      type="time"
                      value={cfg.hora}
                      onChange={e => setHora(cfg.id, e.target.value)}
                      className="h-8 px-3 rounded-lg text-[13px] border"
                      style={{
                        border: "1px solid var(--ds-border)",
                        color: "var(--ds-fg)",
                        background: "var(--ds-surface)",
                        fontFamily: "Fira Code, monospace",
                      }}
                    />
                  </div>

                  {/* Días */}
                  <div className="flex items-center gap-3">
                    <Calendar size={14} style={{ color: "var(--ds-fg-subtle)" }} />
                    <span className="text-[12px] font-medium w-16" style={{ color: "var(--ds-fg-muted)" }}>Días</span>
                    <div className="flex gap-1.5">
                      {DIAS.map((d, i) => {
                        const active = cfg.diasSemana.includes(i)
                        return (
                          <button
                            key={i}
                            onClick={() => toggleDia(cfg.id, i)}
                            className="w-9 h-9 rounded-lg text-[11px] font-semibold transition-all"
                            style={{
                              background: active ? info.color : "var(--ds-muted)",
                              color: active ? "#fff" : "var(--ds-fg-subtle)",
                              border: active ? `1px solid ${info.color}` : "1px solid transparent",
                            }}
                          >
                            {d}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Mensaje */}
                  <div className="flex items-start gap-3">
                    <Bell size={14} style={{ color: "var(--ds-fg-subtle)", marginTop: 2 }} />
                    <span className="text-[12px] font-medium w-16 pt-0.5" style={{ color: "var(--ds-fg-muted)" }}>Mensaje</span>
                    <input
                      type="text"
                      value={cfg.mensaje}
                      onChange={e => setMensaje(cfg.id, e.target.value)}
                      className="flex-1 h-8 px-3 rounded-lg text-[12px] border"
                      style={{ border: "1px solid var(--ds-border)", color: "var(--ds-fg)", background: "var(--ds-surface)" }}
                    />
                  </div>

                  {/* Guardar */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => guardar(cfg.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                      style={{
                        background: guardado === cfg.id ? "#059669" : info.color,
                        color: "#fff",
                      }}
                    >
                      <Save size={13} />
                      {guardado === cfg.id ? "¡Guardado!" : "Guardar"}
                    </button>
                  </div>
                </div>
              )}

              {/* Próximo disparo */}
              {cfg.activa && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--ds-border)" }}>
                  <span className="text-[11px]" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
                    Días activos: {cfg.diasSemana.map(d => DIAS[d]).join(", ")} · {cfg.hora}h
                    {cfg.ultimaDisparo ? ` · Último disparo: ${cfg.ultimaDisparo}` : ""}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}
