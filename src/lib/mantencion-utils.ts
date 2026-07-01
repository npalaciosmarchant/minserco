import { InformeEntrega, EstadoEquipoEntrega, Mantencion, FrecuenciaMantencion } from "./types"
import { informesEntrega } from "./store"

export const FRECUENCIAS: { value: FrecuenciaMantencion; label: string; meses: number }[] = [
  { value: "ninguna",    label: "Sin frecuencia", meses: 0 },
  { value: "mensual",    label: "Mensual",        meses: 1 },
  { value: "trimestral", label: "Trimestral",     meses: 3 },
  { value: "semestral",  label: "Semestral",      meses: 6 },
  { value: "anual",      label: "Anual",          meses: 12 },
]

export function frecuenciaMeses(f?: FrecuenciaMantencion): number {
  return FRECUENCIAS.find(x => x.value === f)?.meses ?? 0
}

// Calcula la próxima fecha (YYYY-MM-DD) sumando los meses de la frecuencia
export function calcularProxima(fechaISO: string, frecuencia?: FrecuenciaMantencion): string {
  const meses = frecuenciaMeses(frecuencia)
  if (!meses || !fechaISO) return ""
  const d = new Date(fechaISO + "T00:00:00")
  if (isNaN(d.getTime())) return ""
  d.setMonth(d.getMonth() + meses)
  return d.toISOString().slice(0, 10)
}

// Construye un Informe de Entrega (emitido) a partir de una mantención completada
export function informeDesdeMantencion(m: Mantencion): Omit<InformeEntrega, "id" | "creadoEn"> {
  const tecnico = (m.tecnicos && m.tecnicos.length ? m.tecnicos.join(", ") : m.tecnico) || "—"
  return {
    numero: informesEntrega.nextNumero(),
    equipo: m.equipo,
    numeroSerie: m.numeroSerie || "",
    cliente: "Mantención interna",
    empresa: "Minserco SpA",
    direccion: "",
    tecnico,
    fechaEntrega: m.fecha,
    estadoEquipo: "bueno",
    descripcionEntrega: `Mantención ${m.tipo} realizada. ${m.descripcion}`,
    itemsEntregados: [],
    observaciones: m.observaciones || "",
    fotos: m.fotos ?? [],
    estado: "emitido",
  }
}

const estadoEquipoCfg: Record<EstadoEquipoEntrega, { label: string; color: string; bg: string }> = {
  excelente:  { label: "Excelente",  color: "#059669", bg: "#f0fdf4" },
  bueno:      { label: "Bueno",      color: "#2563eb", bg: "#eff6ff" },
  regular:    { label: "Regular",    color: "#d97706", bg: "#fffbeb" },
  con_fallas: { label: "Con fallas", color: "#dc2626", bg: "#fef2f2" },
}

// Genera el PDF del informe (misma plantilla que Informes de Entrega)
export function generarInformePDF(inf: InformeEntrega, fotos: string[] = []) {
  const eq = estadoEquipoCfg[inf.estadoEquipo]
  const logoUrl = window.location.origin + "/logo_minserco.png?v=2"
  const items = (inf.itemsEntregados || []).filter(Boolean)
  const imgs = (fotos || []).filter(Boolean)
  const fotosHtml = imgs.length > 0
    ? `<div class="section" style="margin-bottom:20px;"><h3>Fotos (${imgs.length})</h3><div style="display:flex;flex-wrap:wrap;gap:8px">${imgs.map(f => `<img src="${f.startsWith("http") || f.startsWith("data:") ? f : "data:image/jpeg;base64," + f}" style="width:150px;height:150px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0" />`).join("")}</div></div>`
    : ""
  const html = `
<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/>
<style>
  body { font-family: Georgia, serif; margin: 0; padding: 40px; color: #111; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a3673; padding-bottom: 20px; margin-bottom: 24px; }
  .logo-img { height: 80px; width: auto; object-fit: contain; }
  .doc-title { font-size: 18px; font-weight: 700; color: #1a3673; text-align: right; }
  .doc-num { font-size: 13px; color: #64748b; text-align: right; margin-top: 4px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .section h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 0 0 12px; }
  .field { margin-bottom: 8px; }
  .field-label { font-size: 11px; color: #64748b; margin-bottom: 2px; }
  .field-value { font-size: 13px; font-weight: 600; color: #111; }
  .estado-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; background: ${eq.bg}; color: ${eq.color}; border: 1px solid ${eq.color}30; }
  .items-list { list-style: none; padding: 0; margin: 0; }
  .items-list li { padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .items-list li::before { content: "\\2713 "; color: #059669; font-weight: 700; }
  .firma-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
  .firma-box { border-top: 2px solid #334155; padding-top: 10px; }
  .firma-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
</style></head><body>
<div class="header">
  <div><img src="${logoUrl}" alt="Minserco" class="logo-img" /></div>
  <div>
    <div class="doc-title">INFORME DE MANTENCIÓN</div>
    <div class="doc-num">${inf.numero}</div>
    <div class="doc-num">Fecha: ${inf.fechaEntrega}</div>
  </div>
</div>
<div class="grid2">
  <div class="section">
    <h3>Datos del Equipo</h3>
    <div class="field"><div class="field-label">Equipo</div><div class="field-value">${inf.equipo}</div></div>
    ${inf.numeroSerie ? `<div class="field"><div class="field-label">N° Serie</div><div class="field-value">${inf.numeroSerie}</div></div>` : ""}
    <div class="field"><div class="field-label">Estado del equipo</div><div style="margin-top:4px;"><span class="estado-badge">${eq.label}</span></div></div>
  </div>
  <div class="section">
    <h3>Responsable</h3>
    <div class="field"><div class="field-label">Técnico(s)</div><div class="field-value">${inf.tecnico}</div></div>
    <div class="field"><div class="field-label">Registro</div><div class="field-value">${inf.cliente}${inf.empresa ? ` — ${inf.empresa}` : ""}</div></div>
  </div>
</div>
<div class="section" style="margin-bottom:20px;">
  <h3>Descripción</h3>
  <p style="margin:0;line-height:1.6;">${inf.descripcionEntrega}</p>
</div>
${items.length > 0 ? `<div class="section" style="margin-bottom:20px;"><h3>Ítems</h3><ul class="items-list">${items.map(i => `<li>${i}</li>`).join("")}</ul></div>` : ""}
${fotosHtml}
${inf.observaciones ? `<div class="section" style="margin-bottom:20px;"><h3>Observaciones</h3><p style="margin:0;line-height:1.6;">${inf.observaciones}</p></div>` : ""}
<div class="firma-section">
  <div class="firma-box"><div style="height:60px;"></div><div class="firma-label">Firma Técnico Minserco</div><div style="font-size:12px;color:#334155;margin-top:4px;">${inf.tecnico}</div></div>
  <div class="firma-box"><div style="height:60px;"></div><div class="firma-label">Firma Supervisor</div></div>
</div>
<div class="footer">Minserco SpA · Sistema de Gestión Operacional · ${inf.numero} · ${new Date().toLocaleDateString("es-CL")}</div>
</body></html>`
  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 500)
}
