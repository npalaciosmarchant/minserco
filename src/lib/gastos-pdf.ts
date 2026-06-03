"use client"

import { Gasto } from "./types"

function formatCLP(n: number, moneda: string): string {
  if (moneda === "USD") return `USD ${n.toLocaleString("es-CL")}`
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}

const categoriaLabel: Record<string, string> = {
  materiales: "Materiales", viaticos: "Viáticos", herramientas: "Herramientas",
  servicios: "Servicios", combustible: "Combustible", alojamiento: "Alojamiento", otro: "Otro",
}

const estadoLabel: Record<string, string> = {
  borrador: "Borrador", enviado: "Enviado", aprobado: "Aprobado", rechazado: "Rechazado",
}

const estadoColor: Record<string, string> = {
  borrador: "#94a3b8", enviado: "#2563eb", aprobado: "#059669", rechazado: "#dc2626",
}

export interface OpcionesGastosPDF {
  gastos: Gasto[]
  titulo?: string
  subtitulo?: string
  periodoLabel?: string
}

export function imprimirGastosPDF({ gastos: lista, titulo, subtitulo, periodoLabel }: OpcionesGastosPDF) {
  const logoUrl = window.location.origin + "/logo_minserco.png?v=2"
  const fechaGeneracion = new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })

  const totalCLP = lista.reduce((s, g) => s + (g.moneda === "CLP" ? g.monto : g.monto * 900), 0)

  // Agrupar por categoría
  const porCategoria: Record<string, { items: Gasto[]; total: number }> = {}
  lista.forEach(g => {
    if (!porCategoria[g.categoria]) porCategoria[g.categoria] = { items: [], total: 0 }
    porCategoria[g.categoria].items.push(g)
    porCategoria[g.categoria].total += g.moneda === "CLP" ? g.monto : g.monto * 900
  })

  const filasHTML = lista.map((g, i) => {
    const est = estadoLabel[g.estado] ?? g.estado
    const estColor = estadoColor[g.estado] ?? "#94a3b8"
    const cat = categoriaLabel[g.categoria] ?? g.categoria
    return `
    <tr style="border-bottom: 1px solid #f1f5f9; ${i % 2 === 1 ? "background: #f9fafb;" : ""}">
      <td style="padding: 8px 12px; font-size: 12px; color: #374151;">${g.fecha}</td>
      <td style="padding: 8px 12px; font-size: 12px; color: #111827; font-weight: 500;">${g.descripcion}</td>
      <td style="padding: 8px 12px; font-size: 11px; color: #6b7280;">${cat}</td>
      <td style="padding: 8px 12px; font-size: 12px; color: #374151;">${g.responsable}</td>
      <td style="padding: 8px 12px; font-size: 11px; text-align: center;">
        <span style="background: ${estColor}22; color: ${estColor}; border: 1px solid ${estColor}44; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600;">${est.toUpperCase()}</span>
      </td>
      <td style="padding: 8px 12px; font-size: 12px; color: #111827; font-weight: 600; text-align: right;">${formatCLP(g.monto, g.moneda)}</td>
    </tr>`
  }).join("")

  const categoriaRows = Object.entries(porCategoria)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, { total, items }]) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></div>
          <span style="font-size: 12px; color: #374151;">${categoriaLabel[cat] ?? cat}</span>
          <span style="font-size: 11px; color: #9ca3af;">(${items.length})</span>
        </div>
        <span style="font-size: 12px; font-weight: 600; color: #111827;">${formatCLP(total, "CLP")}</span>
      </div>
    `).join("")

  const aprobados = lista.filter(g => g.estado === "aprobado")
  const pendientes = lista.filter(g => g.estado === "borrador" || g.estado === "enviado")

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${titulo ?? "Rendición de Gastos"} — Minserco</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #111827; }
    .page { max-width: 900px; margin: 0 auto; padding: 40px 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #2563eb; }
    .logo-img { height: 60px; width: auto; object-fit: contain; display: block; }
    .doc-title { font-size: 22px; font-weight: 700; color: #111827; }
    .doc-sub { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .doc-meta { font-size: 11px; color: #9ca3af; margin-top: 2px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .stat-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; }
    .stat-value { font-size: 20px; font-weight: 800; color: #111827; }
    .stat-label { font-size: 11px; color: #9ca3af; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 12px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 28px; }
    thead { background: #111827; }
    thead th { padding: 10px 12px; font-size: 11px; font-weight: 600; color: #f9fafb; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:last-child { text-align: right; }
    .total-bar { background: #111827; border-radius: 10px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
    .total-bar span:first-child { font-size: 13px; font-weight: 600; color: #f9fafb; }
    .total-bar span:last-child { font-size: 20px; font-weight: 800; color: #f59e0b; }
    .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; display: flex; justify-content: space-between; }
    .footer p { font-size: 11px; color: #9ca3af; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px 24px; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <img src="${logoUrl}" alt="Minserco" class="logo-img" />
    </div>
    <div style="text-align: right;">
      <div class="doc-title">${titulo ?? "Rendición de Gastos"}</div>
      ${subtitulo ? `<div class="doc-sub">${subtitulo}</div>` : ""}
      ${periodoLabel ? `<div class="doc-meta">Período: ${periodoLabel}</div>` : ""}
      <div class="doc-meta">Generado: ${fechaGeneracion}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${lista.length}</div>
      <div class="stat-label">Total gastos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #059669;">${aprobados.length}</div>
      <div class="stat-label">Aprobados</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #d97706;">${pendientes.length}</div>
      <div class="stat-label">Pendientes</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #2563eb; font-size: 15px;">${formatCLP(totalCLP, "CLP")}</div>
      <div class="stat-label">Monto total</div>
    </div>
  </div>

  <div class="two-col">
    <div class="box">
      <div class="section-title">Por categoría</div>
      ${categoriaRows}
    </div>
    <div class="box">
      <div class="section-title">Por estado</div>
      ${Object.entries(estadoLabel).map(([k, v]) => {
        const count = lista.filter(g => g.estado === k).length
        if (count === 0) return ""
        const total = lista.filter(g => g.estado === k).reduce((s, g) => s + (g.moneda === "CLP" ? g.monto : g.monto * 900), 0)
        return `<div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #374151;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${estadoColor[k]}; display: inline-block;"></span>
            ${v} <span style="color: #9ca3af;">(${count})</span>
          </span>
          <span style="font-size: 12px; font-weight: 600; color: #111827;">${formatCLP(total, "CLP")}</span>
        </div>`
      }).join("")}
    </div>
  </div>

  <div class="section-title">Detalle de gastos</div>
  <table>
    <thead>
      <tr>
        <th style="width: 90px;">Fecha</th>
        <th>Descripción</th>
        <th style="width: 100px;">Categoría</th>
        <th style="width: 120px;">Responsable</th>
        <th style="width: 90px; text-align: center;">Estado</th>
        <th style="width: 110px; text-align: right;">Monto</th>
      </tr>
    </thead>
    <tbody>${filasHTML}</tbody>
  </table>

  <div class="total-bar">
    <span>TOTAL RENDICIÓN (equiv. CLP)</span>
    <span>${formatCLP(totalCLP, "CLP")}</span>
  </div>

  <div class="footer">
    <p>Minserco — Supresión de polvo industrial · minserco.cl</p>
    <p>${fechaGeneracion}</p>
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
