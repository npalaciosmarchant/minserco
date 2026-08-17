"use client"

import { EntradaInstalacion, Recomendacion } from "./instalacion-utils"
import { bosquejoSVG } from "./bosquejo"

interface MetaInst { cliente?: string; faena?: string; puntoDescarga?: string; fecha?: string }

function esc(s?: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function imprimirInstalacionPDF(e: EntradaInstalacion, r: Recomendacion, meta: MetaInst = {}) {
  const logoUrl = window.location.origin + "/logo_minserco.png?v=2"
  const fecha = meta.fecha
    ? new Date(meta.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })

  const chip = (l: string, v: string) => `<div class="chip"><div class="chip-l">${esc(l)}</div><div class="chip-v">${esc(v)}</div></div>`

  const chips = [
    r.sistema === "mhky" ? "" : chip("Presión aire disponible", `${e.presionAire} bar`),
    chip("Presión agua disponible", `${e.presionAgua} bar`),
    chip("Boquillas", `${e.nBoquillas} · ${r.boquillaModelo}`),
    chip("Caudal agua total", `${r.aguaTotalLmin} L/min`),
    r.aireTotalM3h > 0 ? chip("Consumo aire total", `${r.aireTotalM3h} m³/h`) : "",
    r.bomba ? chip("Bomba", r.bomba.modelo) : "",
    chip("Estanque", r.estanque.litros >= 1000 ? `${r.estanque.litros / 1000}.000 L` : `${r.estanque.litros} L`),
    meta.puntoDescarga ? chip("Punto de descarga", meta.puntoDescarga) : "",
  ].join("")

  const perf = r.ok ? `
    <div class="perf">
      ${r.fila
        ? `${chip("Punto de trabajo", `aire ${r.fila.pAire} bar · agua ${r.fila.pAgua} bar`)}${chip("Alcance de nube", `${r.fila.alcanceM} m`)}${chip("Tamaño de gota", `${r.fila.gotaUm} µm`)}`
        : chip("Presión de trabajo", `agua ${r.setAgua} bar`)}
      ${chip("Aporte de frío", `${r.aporteFrioTotal.toLocaleString("es-CL")} frig./h`)}
    </div>` : `<p class="warn-block">No hay un punto de trabajo válido con las presiones disponibles. Revise las advertencias.</p>`

  const li = (t: string, d?: string) => `<li><span class="li-t">${esc(t)}</span>${d ? `<span class="li-d">${esc(d)}</span>` : ""}</li>`
  const instalar = r.instalar.map(i => li(i.texto, i.detalle)).join("")
  const noInstalar = r.noInstalar.map(i => li(i.texto, i.detalle)).join("")
  const adv = r.advertencias.length
    ? `<div class="adv"><h3>Advertencias</h3><ul>${r.advertencias.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>`
    : ""

  const svg = bosquejoSVG(e, r)

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Informe de Instalación — Minserco</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',system-ui,Arial,sans-serif; color:#0f172a; background:#fff; }
  .page { max-width:1000px; margin:0 auto; padding:32px 40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #f59e0b; padding-bottom:16px; margin-bottom:18px; }
  .logo-img { height:64px; }
  .title { font-size:22px; font-weight:800; letter-spacing:-0.3px; }
  .subtitle { font-size:12px; color:#64748b; margin-top:2px; }
  .sec-label { font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#94a3b8; margin:18px 0 8px; }
  .chips { display:flex; flex-wrap:wrap; gap:10px; }
  .chip { border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; min-width:120px; }
  .chip-l { font-size:10px; color:#64748b; }
  .chip-v { font-size:14px; font-weight:700; }
  .perf { display:flex; flex-wrap:wrap; gap:10px; }
  .diagram { border:1px solid #e2e8f0; border-radius:12px; padding:8px; margin-top:6px; }
  .panels { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:16px; }
  .panel { border-radius:10px; padding:14px 16px; }
  .panel.ok { background:#f0fdf4; border:1px solid #bbf7d0; }
  .panel.no { background:#fef2f2; border:1px solid #fecaca; }
  .panel h3 { font-size:12px; font-weight:800; letter-spacing:0.5px; margin-bottom:8px; }
  .panel.ok h3 { color:#059669; }
  .panel.no h3 { color:#dc2626; }
  .panel ul { list-style:none; }
  .panel li { font-size:12px; margin-bottom:7px; line-height:1.35; }
  .panel.ok li::before { content:"✓  "; color:#059669; font-weight:700; }
  .panel.no li::before { content:"✗  "; color:#dc2626; font-weight:700; }
  .li-t { font-weight:600; }
  .li-d { display:block; color:#64748b; font-size:11px; margin-left:16px; }
  .adv { background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 16px; margin-top:14px; }
  .adv h3 { font-size:12px; color:#b45309; margin-bottom:6px; }
  .adv li { font-size:12px; color:#92400e; margin-left:16px; }
  .warn-block { background:#fef2f2; border:1px solid #fecaca; color:#b91c1c; padding:10px 14px; border-radius:8px; font-size:13px; }
  .footer { margin-top:22px; border-top:1px solid #e2e8f0; padding-top:10px; font-size:11px; color:#94a3b8; text-align:center; }
</style></head>
<body><div class="page">
  <div class="header">
    <div>
      <div class="title">Informe de Instalación — Supresión de Polvo</div>
      <div class="subtitle">Nebulización aire-agua Turbofog · Minserco · ${fecha}</div>
      ${meta.cliente || meta.faena ? `<div class="subtitle">${esc(meta.cliente ?? "")}${meta.faena ? " · " + esc(meta.faena) : ""}</div>` : ""}
    </div>
    <img src="${logoUrl}" class="logo-img" alt="Minserco" onerror="this.style.display='none'"/>
  </div>

  <div class="sec-label">Datos ingresados por el técnico</div>
  <div class="chips">${chips}</div>

  <div class="sec-label">Resultado del cálculo</div>
  ${perf}

  <div class="sec-label">Bosquejo de instalación</div>
  <div class="diagram">${svg}</div>

  <div class="panels">
    <div class="panel ok"><h3>SE DEBE INSTALAR</h3><ul>${instalar}</ul></div>
    <div class="panel no"><h3>NO SE INSTALA</h3><ul>${noInstalar || "<li>—</li>"}</ul></div>
  </div>
  ${adv}

  <div class="footer">
    Minserco — Supresión de polvo industrial · minserco.cl · Documento generado el ${new Date().toLocaleDateString("es-CL")}<br/>
    Valores orientativos según fichas técnicas; ajustar en puesta en marcha según temperatura, humedad y ventilación.
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`

  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(html)
  w.document.close()
}
