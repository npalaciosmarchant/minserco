"use client"

import { Cotizacion } from "./types"

function formatCLP(n: number): string {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}

export function imprimirCotizacionPDF(c: Cotizacion) {
  const logoUrl = window.location.origin + "/logo_minserco.png?v=2"
  const fechaFormateada = new Date(c.fechaEmision || c.creadoEn).toLocaleDateString("es-CL", {
    day: "2-digit", month: "long", year: "numeric",
  })
  const validezFecha = c.validezDias
    ? new Date(Date.now() + c.validezDias * 86400000).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })
    : null

  const estadoColor: Record<string, string> = {
    borrador: "#94a3b8",
    enviada: "#60a5fa",
    aceptada: "#10b981",
    rechazada: "#ef4444",
    vencida: "#f97316",
  }
  const color = estadoColor[c.estado] ?? "#94a3b8"

  const itemsHTML = c.items.map((item, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 12px; font-size: 13px; color: #111827;">${i + 1}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #111827;">${item.descripcion}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #374151; text-align: right;">${item.cantidad}</td>
      <td style="padding: 10px 12px; font-size: 13px; color: #374151; text-align: right;">${formatCLP(item.precioUnitario)}</td>
      <td style="padding: 10px 12px; font-size: 13px; font-weight: 600; color: #111827; text-align: right;">${formatCLP(item.subtotal)}</td>
    </tr>
  `).join("")

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cotización ${c.numero} — Minserco</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Georgia', 'Times New Roman', serif; background: #fff; color: #111827; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 24px; border-bottom: 2px solid #f59e0b; }
    .logo-block {}
    .logo-img { height: 80px; width: auto; object-fit: contain; display: block; }
    .company-name { font-size: 26px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
    .company-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .doc-info { text-align: right; }
    .doc-numero { font-size: 22px; font-weight: 700; color: #f59e0b; }
    .doc-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
    .doc-fecha { font-size: 13px; color: #374151; margin-top: 6px; }

    /* Estado badge */
    .estado-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }

    /* Client + company */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .info-block { background: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; }
    .info-block h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 8px; }
    .info-block p { font-size: 13px; color: #374151; line-height: 1.6; }
    .info-block strong { color: #111827; font-weight: 600; }

    /* Table */
    .table-section { margin-bottom: 24px; }
    .table-section h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
    thead { background: #111827; }
    thead th { padding: 10px 12px; font-size: 11px; font-weight: 600; color: #f9fafb; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody tr:hover { background: #f3f4f6; }

    /* Totals */
    .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
    .totals-box { width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
    .total-row span:first-child { color: #6b7280; }
    .total-row span:last-child { color: #111827; font-weight: 500; }
    .total-final { background: #111827; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .total-final span:first-child { font-size: 13px; font-weight: 600; color: #f9fafb; }
    .total-final span:last-child { font-size: 18px; font-weight: 800; color: #f59e0b; }

    /* Notes + validity */
    .notes-section { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin-bottom: 28px; }
    .notes-section h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #92400e; margin-bottom: 6px; }
    .notes-section p { font-size: 13px; color: #78350f; line-height: 1.5; }

    /* Footer */
    .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; display: flex; justify-content: space-between; align-items: center; }
    .footer p { font-size: 11px; color: #9ca3af; }
    .footer-highlight { font-size: 11px; color: #f59e0b; font-weight: 600; }

    /* Validity strip */
    .validity { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; font-size: 13px; color: #065f46; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px 24px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo-block">
        <img src="${logoUrl}" alt="Minserco" class="logo-img" />
      </div>
      <div class="doc-info">
        <div class="doc-label">Cotización</div>
        <div class="doc-numero">${c.numero}</div>
        <div class="doc-fecha">${fechaFormateada}</div>
        <div>
          <span class="estado-badge" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44;">
            ${c.estado.toUpperCase()}
          </span>
        </div>
      </div>
    </div>

    <!-- Client info -->
    <div class="grid-2">
      <div class="info-block">
        <h3>Cliente</h3>
        <p>
          <strong>${c.empresa || c.cliente}</strong><br/>
          ${c.empresa ? c.cliente : ""}
          ${c.telefono ? `<br/>${c.telefono}` : ""}
          ${c.email ? `<br/>${c.email}` : ""}
        </p>
      </div>
      <div class="info-block">
        <h3>Detalles del documento</h3>
        <p>
          <strong>Número:</strong> ${c.numero}<br/>
          <strong>Fecha:</strong> ${fechaFormateada}<br/>
          ${c.validezDias ? `<strong>Validez:</strong> ${c.validezDias} días${validezFecha ? ` (hasta ${validezFecha})` : ""}<br/>` : ""}
          <strong>Estado:</strong> ${c.estado}
        </p>
      </div>
    </div>

    <!-- Items table -->
    <div class="table-section">
      <h3>Detalle de servicios y materiales</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 40px">#</th>
            <th>Descripción</th>
            <th style="width: 80px; text-align: right;">Cant.</th>
            <th style="width: 130px; text-align: right;">Precio unit.</th>
            <th style="width: 130px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${formatCLP(c.subtotal)}</span>
        </div>
        ${c.descuento > 0 ? `
        <div class="total-row">
          <span>Descuento</span>
          <span style="color: #10b981;">- ${formatCLP(c.descuento)}</span>
        </div>` : ""}
        <div class="total-row">
          <span>IVA (19%)</span>
          <span>${formatCLP(Math.round(c.total * 0.19 / 1.19))}</span>
        </div>
        <div class="total-final">
          <span>TOTAL</span>
          <span>${formatCLP(c.total)}</span>
        </div>
      </div>
    </div>

    ${c.notas ? `
    <!-- Notes -->
    <div class="notes-section">
      <h3>Notas y condiciones</h3>
      <p>${c.notas}</p>
    </div>` : ""}

    ${validezFecha ? `
    <div class="validity">
      ✓ Esta cotización tiene validez hasta el <strong>${validezFecha}</strong>
    </div>` : ""}

    <!-- Footer -->
    <div class="footer">
      <p>Minserco — Supresión de polvo industrial · minserco.cl</p>
      <p class="footer-highlight">Documento generado el ${new Date().toLocaleDateString("es-CL")}</p>
    </div>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(html)
  w.document.close()
}
