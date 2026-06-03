"use client"

import { useEffect, useState } from "react"
import { CheckSquare, Plus, Trash2, Printer, ChevronDown, ChevronRight, GripVertical, RefreshCw } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

type TipoEquipo = "supresor_polvo" | "nebulizador" | "bomba"
type FaseChecklist = "pre_servicio" | "post_servicio"

interface ItemCheck {
  id: string
  texto: string
  checked: boolean
}

interface Checklist {
  tipo: TipoEquipo
  fase: FaseChecklist
  items: ItemCheck[]
}

const TIPO_LABEL: Record<TipoEquipo, string> = {
  supresor_polvo: "Supresor de Polvo",
  nebulizador:    "Nebulizador",
  bomba:          "Bomba",
}

const TIPO_COLOR: Record<TipoEquipo, string> = {
  supresor_polvo: "#0369A1",
  nebulizador:    "#059669",
  bomba:          "#D97706",
}

const FASE_LABEL: Record<FaseChecklist, string> = {
  pre_servicio:  "Pre-Servicio",
  post_servicio: "Post-Servicio",
}

const DEFAULTS: Checklist[] = [
  {
    tipo: "supresor_polvo", fase: "pre_servicio",
    items: [
      { id: "sp-pre-1", texto: "Verificar nivel de agua en estanque", checked: false },
      { id: "sp-pre-2", texto: "Revisar presión del sistema (mín. 4 bar)", checked: false },
      { id: "sp-pre-3", texto: "Inspeccionar boquillas de aspersión", checked: false },
      { id: "sp-pre-4", texto: "Comprobar estado de mangueras y conexiones", checked: false },
      { id: "sp-pre-5", texto: "Verificar funcionamiento del panel de control", checked: false },
      { id: "sp-pre-6", texto: "Revisar filtros de agua", checked: false },
    ],
  },
  {
    tipo: "supresor_polvo", fase: "post_servicio",
    items: [
      { id: "sp-post-1", texto: "Purgar líneas de agua", checked: false },
      { id: "sp-post-2", texto: "Limpiar boquillas obstruidas", checked: false },
      { id: "sp-post-3", texto: "Registrar presión final de operación", checked: false },
      { id: "sp-post-4", texto: "Verificar consumo eléctrico del motor", checked: false },
      { id: "sp-post-5", texto: "Documentar anomalías detectadas", checked: false },
    ],
  },
  {
    tipo: "nebulizador", fase: "pre_servicio",
    items: [
      { id: "neb-pre-1", texto: "Revisar nivel de solución en depósito", checked: false },
      { id: "neb-pre-2", texto: "Comprobar estado del cabezal de nebulización", checked: false },
      { id: "neb-pre-3", texto: "Verificar conexiones eléctricas", checked: false },
      { id: "neb-pre-4", texto: "Revisar sistema de filtración", checked: false },
      { id: "neb-pre-5", texto: "Probar ciclo de nebulización en manual", checked: false },
    ],
  },
  {
    tipo: "nebulizador", fase: "post_servicio",
    items: [
      { id: "neb-post-1", texto: "Limpiar cabezal nebulizador con agua destilada", checked: false },
      { id: "neb-post-2", texto: "Vaciar y enjuagar depósito si procede", checked: false },
      { id: "neb-post-3", texto: "Revisar microcontrolador y configuración de ciclos", checked: false },
      { id: "neb-post-4", texto: "Registrar caudal de nebulización observado", checked: false },
    ],
  },
  {
    tipo: "bomba", fase: "pre_servicio",
    items: [
      { id: "bom-pre-1", texto: "Verificar nivel de aceite del cárter", checked: false },
      { id: "bom-pre-2", texto: "Revisar empaquetaduras y sellos", checked: false },
      { id: "bom-pre-3", texto: "Comprobar alineación del acoplamiento", checked: false },
      { id: "bom-pre-4", texto: "Verificar sentido de giro del motor", checked: false },
      { id: "bom-pre-5", texto: "Revisar válvulas de aspiración y descarga", checked: false },
      { id: "bom-pre-6", texto: "Comprobar manómetros de succión y descarga", checked: false },
    ],
  },
  {
    tipo: "bomba", fase: "post_servicio",
    items: [
      { id: "bom-post-1", texto: "Registrar caudal y presión de operación", checked: false },
      { id: "bom-post-2", texto: "Verificar temperatura del motor al finalizar", checked: false },
      { id: "bom-post-3", texto: "Revisar posibles vibraciones anómalas", checked: false },
      { id: "bom-post-4", texto: "Cambiar aceite si corresponde (según horómetro)", checked: false },
      { id: "bom-post-5", texto: "Documentar horas de operación", checked: false },
    ],
  },
]

const STORAGE_KEY = "checklist_config"
const SESSION_KEY = "checklist_sesion"

function loadConfig(): Checklist[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : DEFAULTS
  } catch { return DEFAULTS }
}

function saveConfig(data: Checklist[]) {
  // Solo guardar la estructura (sin checks)
  const clean = data.map(c => ({ ...c, items: c.items.map(i => ({ ...i, checked: false })) }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
}

function loadSesion(): Record<string, boolean> {
  try {
    const s = localStorage.getItem(SESSION_KEY)
    return s ? JSON.parse(s) : {}
  } catch { return {} }
}

function saveSesion(data: Record<string, boolean>) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(data))
}

function getId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function ChecklistPage() {
  const [config, setConfig]   = useState<Checklist[]>([])
  const [sesion, setSesion]   = useState<Record<string, boolean>>({})
  const [tipoActivo, setTipo] = useState<TipoEquipo>("supresor_polvo")
  const [faseActiva, setFase] = useState<FaseChecklist>("pre_servicio")
  const [editMode, setEdit]   = useState(false)
  const [nuevoItem, setNuevo] = useState("")
  const [equipoNombre, setEquipoNombre] = useState("")
  const [tecnicoNombre, setTecnico]     = useState("")
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    setConfig(loadConfig())
    setSesion(loadSesion())
  }, [])

  const lista = config.find(c => c.tipo === tipoActivo && c.fase === faseActiva)
  const checkedCount = lista?.items.filter(i => sesion[i.id]).length ?? 0
  const totalCount = lista?.items.length ?? 0
  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  function toggle(itemId: string) {
    const next = { ...sesion, [itemId]: !sesion[itemId] }
    setSesion(next)
    saveSesion(next)
  }

  function resetSesion() {
    if (!lista) return
    const next = { ...sesion }
    lista.items.forEach(i => { delete next[i.id] })
    setSesion(next)
    saveSesion(next)
  }

  function addItem() {
    if (!nuevoItem.trim() || !lista) return
    const updated = config.map(c =>
      c.tipo === tipoActivo && c.fase === faseActiva
        ? { ...c, items: [...c.items, { id: getId(), texto: nuevoItem.trim(), checked: false }] }
        : c
    )
    setConfig(updated)
    saveConfig(updated)
    setNuevo("")
  }

  function removeItem(itemId: string) {
    const updated = config.map(c =>
      c.tipo === tipoActivo && c.fase === faseActiva
        ? { ...c, items: c.items.filter(i => i.id !== itemId) }
        : c
    )
    setConfig(updated)
    saveConfig(updated)
  }

  function imprimir() {
    const logoUrl = window.location.origin + "/logo_minserco.png?v=2"
    const fecha = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

    const itemsHTML = (lista?.items ?? []).map(i => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 18px; height: 18px; border: 2px solid ${TIPO_COLOR[tipoActivo]}; border-radius: 4px; flex-shrink: 0; ${sesion[i.id] ? `background: ${TIPO_COLOR[tipoActivo]};` : ""}"></div>
            <span style="font-size: 13px; color: ${sesion[i.id] ? "#9ca3af" : "#111827"}; ${sesion[i.id] ? "text-decoration: line-through;" : ""}">${i.texto}</span>
          </div>
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; width: 80px; text-align: center;">
          <span style="font-size: 11px; font-weight: 600; color: ${sesion[i.id] ? "#059669" : "#9ca3af"};">${sesion[i.id] ? "✓ OK" : "—"}</span>
        </td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f1f5f9; width: 200px; color: #9ca3af; font-size: 11px; border-left: 1px dashed #e5e7eb;">Observación:</td>
      </tr>
    `).join("")

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Checklist ${TIPO_LABEL[tipoActivo]} — ${FASE_LABEL[faseActiva]}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111827; }
    .page { max-width: 800px; margin: 0 auto; padding: 32px 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid ${TIPO_COLOR[tipoActivo]}; margin-bottom: 24px; }
    .logo { height: 50px; object-fit: contain; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    thead th { background: #111827; color: #f9fafb; padding: 10px 12px; font-size: 11px; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; }
    .firma-box { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .firma { border-top: 1px solid #374151; padding-top: 8px; font-size: 11px; color: #6b7280; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; background: ${TIPO_COLOR[tipoActivo]}; width: ${pct}%; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <img src="${logoUrl}" alt="Minserco" class="logo"/>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 18px; font-weight: 700; color: ${TIPO_COLOR[tipoActivo]};">${TIPO_LABEL[tipoActivo]}</div>
      <div style="font-size: 14px; font-weight: 600; color: #374151; margin-top: 2px;">${FASE_LABEL[faseActiva]}</div>
      <div style="font-size: 11px; color: #9ca3af; margin-top: 2px; text-transform: capitalize;">${fecha}</div>
    </div>
  </div>

  ${equipoNombre || tecnicoNombre ? `
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
    ${equipoNombre ? `<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px;">
      <div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Equipo</div>
      <div style="font-size: 13px; font-weight: 600; color: #111827;">${equipoNombre}</div>
    </div>` : ""}
    ${tecnicoNombre ? `<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px;">
      <div style="font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Técnico</div>
      <div style="font-size: 13px; font-weight: 600; color: #111827;">${tecnicoNombre}</div>
    </div>` : ""}
  </div>` : ""}

  <div style="margin-bottom: 8px;">
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; margin-bottom: 4px;">
      <span>Progreso</span><span>${checkedCount}/${totalCount} ítems</span>
    </div>
    <div class="progress-bar"><div class="progress-fill"></div></div>
  </div>

  <table style="margin-top: 16px;">
    <thead>
      <tr>
        <th>Ítem de verificación</th>
        <th style="width: 80px; text-align: center;">Estado</th>
        <th style="width: 200px;">Observación</th>
      </tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <div class="firma-box">
    <div class="firma">Firma técnico: ${tecnicoNombre || "_________________"}<br/><span style="color: #9ca3af; font-size: 10px;">Nombre y firma</span></div>
    <div class="firma">Firma supervisor: _________________<br/><span style="color: #9ca3af; font-size: 10px;">Nombre y firma</span></div>
  </div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`

    const w = window.open("", "_blank")
    if (!w) return
    w.document.write(html)
    w.document.close()
  }

  const color = TIPO_COLOR[tipoActivo]

  return (
    <PageShell
      icon={CheckSquare}
      title="Checklist de Equipos"
      subtitle="Listas de verificación pre y post servicio por tipo de equipo"
      color="#0369A1"
      actions={
        <div className="flex gap-2">
          <button
            className="btn-secondary flex items-center gap-1.5"
            onClick={() => setEdit(e => !e)}
          >
            {editMode ? "Modo revisión" : "Editar ítems"}
          </button>
          <button className="btn-accent flex items-center gap-1.5" onClick={imprimir}>
            <Printer size={14} /> Imprimir
          </button>
        </div>
      }
    >
      {/* Selector tipo + fase */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1.5">
          {(["supresor_polvo", "nebulizador", "bomba"] as TipoEquipo[]).map(t => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: tipoActivo === t ? TIPO_COLOR[t] : "var(--ds-muted)",
                color: tipoActivo === t ? "#fff" : "var(--ds-fg-subtle)",
                border: tipoActivo === t ? `1px solid ${TIPO_COLOR[t]}` : "1px solid transparent",
              }}
            >
              {TIPO_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="h-6 w-px self-center" style={{ background: "var(--ds-border)" }} />
        <div className="flex gap-1.5">
          {(["pre_servicio", "post_servicio"] as FaseChecklist[]).map(f => (
            <button
              key={f}
              onClick={() => setFase(f)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: faseActiva === f ? color : "var(--ds-muted)",
                color: faseActiva === f ? "#fff" : "var(--ds-fg-subtle)",
                border: faseActiva === f ? `1px solid ${color}` : "1px solid transparent",
              }}
            >
              {FASE_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Datos del servicio */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--ds-fg-subtle)" }}>Identificación del equipo</label>
          <input
            type="text"
            value={equipoNombre}
            onChange={e => setEquipoNombre(e.target.value)}
            placeholder="Ej: Supresor SP-001 — Faena El Peñón"
            className="w-full h-8 px-3 rounded-lg text-[12px] border"
            style={{ border: "1px solid var(--ds-border)", color: "var(--ds-fg)", background: "var(--ds-surface)" }}
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: "var(--ds-fg-subtle)" }}>Técnico responsable</label>
          <input
            type="text"
            value={tecnicoNombre}
            onChange={e => setTecnico(e.target.value)}
            placeholder="Nombre del técnico"
            className="w-full h-8 px-3 rounded-lg text-[12px] border"
            style={{ border: "1px solid var(--ds-border)", color: "var(--ds-fg)", background: "var(--ds-surface)" }}
          />
        </div>
      </div>

      {/* Barra de progreso */}
      <div
        className="ds-card p-4 mb-4 cursor-pointer"
        style={{ border: `1px solid ${color}30` }}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown size={14} style={{ color }} /> : <ChevronRight size={14} style={{ color }} />}
            <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>
              {TIPO_LABEL[tipoActivo]} — {FASE_LABEL[faseActiva]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold" style={{ color, fontFamily: "Fira Code, monospace" }}>
              {checkedCount}/{totalCount}
            </span>
            <button
              onClick={e => { e.stopPropagation(); resetSesion() }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
              style={{ color: "var(--ds-fg-subtle)", background: "var(--ds-muted)" }}
              title="Reiniciar checks"
            >
              <RefreshCw size={11} /> Reset
            </button>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--ds-muted)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: pct === 100 ? "#059669" : color }}
          />
        </div>
        {pct === 100 && (
          <p className="text-[11px] mt-1.5 font-semibold" style={{ color: "#059669" }}>
            ✓ Checklist completado
          </p>
        )}
      </div>

      {/* Lista de ítems */}
      {expanded && lista && (
        <div className="ds-card overflow-hidden">
          {lista.items.map((item, i) => {
            const checked = !!sesion[item.id]
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-3 group"
                style={{
                  borderBottom: i < lista.items.length - 1 ? "1px solid var(--ds-border)" : "none",
                  background: checked ? (color + "08") : "transparent",
                  transition: "background 150ms",
                }}
              >
                <button
                  onClick={() => !editMode && toggle(item.id)}
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: checked ? color : "transparent",
                    border: `2px solid ${checked ? color : "var(--ds-border)"}`,
                    cursor: editMode ? "default" : "pointer",
                  }}
                >
                  {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L4 7L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </button>

                {editMode && <GripVertical size={13} style={{ color: "var(--ds-fg-subtle)", opacity: 0.4, cursor: "grab" }} />}

                <span
                  className="flex-1 text-[13px]"
                  style={{
                    color: checked ? "var(--ds-fg-subtle)" : "var(--ds-fg)",
                    textDecoration: checked ? "line-through" : "none",
                    transition: "color 150ms",
                  }}
                >
                  {item.texto}
                </span>

                {editMode && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded"
                    style={{ color: "var(--ds-danger)", transition: "opacity 150ms" }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}

          {/* Agregar ítem en modo edición */}
          {editMode && (
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--ds-border)", background: "var(--ds-muted)" }}>
              <input
                type="text"
                value={nuevoItem}
                onChange={e => setNuevo(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addItem()}
                placeholder="Nuevo ítem de verificación..."
                className="flex-1 h-8 px-3 rounded-lg text-[12px] border"
                style={{ border: "1px solid var(--ds-border)", color: "var(--ds-fg)", background: "var(--ds-surface)" }}
              />
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold"
                style={{ background: color, color: "#fff" }}
              >
                <Plus size={13} /> Agregar
              </button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
