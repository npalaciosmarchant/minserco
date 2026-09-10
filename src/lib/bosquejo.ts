// Generador del bosquejo (SVG vectorial) de la instalación de nebulización.
// Fuente única: se usa tanto en la página como en el informe PDF.

import { EntradaInstalacion, Recomendacion } from "./instalacion-utils"

interface Caja { tag: string; label: string; sub?: string; tipo: "linea" | "bomba" }

// Estado de stock/registro (cruce con los módulos de bodega y equipos) para pintar
// cada caja del bosquejo. "registrado" = no hay stock del repuesto en bodega, pero
// el componente existe como activo físico registrado en Equipos.
export type EstadoStock = "en-stock" | "stock-bajo" | "sin-stock" | "registrado" | "no-encontrado"

export interface BosquejoCtx {
  stockPorTag?: Record<string, { estado: EstadoStock }>
  linkPorTag?: Record<string, string>
}

export const STOCK_COLOR: Record<EstadoStock, string> = {
  "en-stock": "#16a34a",
  "stock-bajo": "#f59e0b",
  "sin-stock": "#dc2626",
  "registrado": "#2563eb",
  "no-encontrado": "#94a3b8",
}

export const STOCK_LABEL: Record<EstadoStock, string> = {
  "en-stock": "En stock",
  "stock-bajo": "Stock bajo",
  "sin-stock": "Sin stock",
  "registrado": "Equipo registrado",
  "no-encontrado": "No encontrado",
}

// Dimensiones base compartidas por el render (bosquejoSVG) y el cálculo de tamaño
// (dimensionesBosquejo), para que nunca queden desincronizadas.
const W = 1200
const MANIFOLD_Y = 150, MANIFOLD_H = 120
const CTRL_Y = 352, CTRL_H = 44
const BASE_H = 500

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// Envuelve el contenido de una caja en un grupo interactivo (data-tag) y, si hay link, en <a>.
function envolver(tag: string, inner: string, ctx?: BosquejoCtx): string {
  const href = ctx?.linkPorTag?.[tag]
  const body = href ? `<a href="${escAttr(href)}" target="_blank" rel="noopener">${inner}</a>` : inner
  return `<g class="ins-caja" data-tag="${escAttr(tag)}" tabindex="0">${body}</g>`
}

function badgeCircle(x: number, y: number, w: number, tag: string, ctx?: BosquejoCtx): string {
  const badge = ctx?.stockPorTag?.[tag]
  if (!badge) return ""
  const color = STOCK_COLOR[badge.estado]
  return `<circle cx="${x + w - 9}" cy="${y + 9}" r="6" fill="${color}" stroke="#ffffff" stroke-width="1.5"><title>${STOCK_LABEL[badge.estado]}</title></circle>`
}

function caja(x: number, y: number, w: number, h: number, c: Caja, ctx?: BosquejoCtx): string {
  const stroke = c.tipo === "bomba" ? "#4f46e5" : "#1d4ed8"
  const fill = c.tipo === "bomba" ? "#eef2ff" : "#ffffff"
  const tag = `<text x="${x + 10}" y="${y + 22}" font-size="12" font-weight="700" fill="#0f172a">${c.tag} · ${c.label}</text>`
  const sub = c.sub ? `<text x="${x + 10}" y="${y + 40}" font-size="10.5" fill="#64748b">${c.sub}</text>` : ""
  const rect = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>${tag}${sub}${badgeCircle(x, y, w, c.tag, ctx)}`
  return envolver(c.tag, rect, ctx)
}

// Construye las cajas de la línea de aire y de agua (izq → der) a partir de la
// entrada/recomendación. Compartido entre el render (bosquejoSVG) y el orden de
// pasos del modo "paso a paso" (ordenTags), para que nunca queden desincronizados.
function construirLineas(e: EntradaInstalacion, r: Recomendacion): { aire: Caja[]; agua: Caja[]; mhky: boolean; sinEnergia: boolean } {
  const mhky = r.sistema === "mhky"
  const sinAire = e.aireEnPlanta === false
  const sinAgua = e.aguaEnPlanta === false
  const sinEnergia = r.energiaEnPlanta === false
  const bombaLbl = r.bomba ? r.bomba.modelo.replace("REGGIO ", "").replace("STAIRS ", "") : "SBI 4-16"
  const estanqueLbl = r.estanque.litros >= 1000 ? `${(r.estanque.litros / 1000).toLocaleString("es-CL")}k L` : `${r.estanque.litros} L`
  const regAgua = !sinAgua && r.setAgua != null && e.presionAgua > (r.setAgua as number) + 0.05
  const regAire = !sinAire && r.setAire != null && e.presionAire > (r.setAire as number) + 0.05
  const necesitaBomba = !sinAgua && r.ok && r.setAgua != null && e.presionAgua < (r.setAgua as number) - 1e-6

  // Componentes de cada línea (izq → der). El sistema MHKY es solo agua: sin línea de aire.
  const aire: Caja[] = mhky ? [] : [
    sinAire
      ? { tag: "A0", label: "Compresor", sub: "KRATTO 6–8 bar", tipo: "bomba" }
      : { tag: "A1", label: "Toma aire", sub: "acople rápido", tipo: "linea" },
    { tag: "A2", label: "Válv. bola", sub: "corte manual", tipo: "linea" },
    { tag: "A3", label: "Filtro FRL", sub: "aire comprimido", tipo: "linea" },
  ]
  if (!mhky && regAire) aire.push({ tag: "A4", label: "Regulador", sub: `ajustar ${r.setAire} bar`, tipo: "linea" })
  if (!mhky) aire.push({ tag: "A5", label: "Válv. solen.", sub: "230V · a nodo", tipo: "linea" })

  const agua: Caja[] = [
    sinAgua
      ? { tag: "W0", label: `Estanque ${estanqueLbl}`, sub: `+ ${bombaLbl}`, tipo: "bomba" }
      : { tag: "W1", label: "Toma agua", sub: "matriz", tipo: "linea" },
    { tag: "W2", label: "Válv. bola", sub: "corte manual", tipo: "linea" },
  ]
  if (necesitaBomba) agua.push({ tag: "WB", label: "Bomba", sub: `booster ${bombaLbl}`, tipo: "bomba" })
  agua.push({ tag: "W3", label: "Filtro agua", sub: "línea RBM", tipo: "linea" })
  if (regAgua) agua.push({ tag: "W4", label: "Regulador", sub: `ajustar ${r.setAgua} bar`, tipo: "linea" })
  agua.push({ tag: "W5", label: "Válv. solen.", sub: "230V · a nodo", tipo: "linea" })

  return { aire, agua, mhky, sinEnergia }
}

// Orden de presentación de los componentes del bosquejo, usado por el modo
// "paso a paso" (resalta secuencialmente cada caja como en una presentación).
export function ordenTags(e: EntradaInstalacion, r: Recomendacion): { tag: string; titulo: string }[] {
  const { aire, agua, sinEnergia } = construirLineas(e, r)
  const pasos: { tag: string; titulo: string }[] = []
  for (const c of aire) pasos.push({ tag: c.tag, titulo: c.label })
  for (const c of agua) pasos.push({ tag: c.tag, titulo: c.label })
  pasos.push({ tag: "MANIFOLD", titulo: "Manifold" })
  pasos.push({ tag: "NOZZLES", titulo: "Boquillas" })
  pasos.push({ tag: "CONTROLADOR", titulo: "Controlador · nodo de monitoreo" })
  if (sinEnergia) pasos.push({ tag: "GENERADOR", titulo: "Generador (sin energía en planta)" })
  pasos.push({ tag: "INSTRUMENTACION", titulo: "Instrumentación" })
  return pasos
}

// Layout de la columna de boquillas: hasta 5 quedan centradas junto al manifold
// (comportamiento histórico); más de 5 pasan a una columna que crece hacia abajo
// desde arriba del manifold, ya que con zoom/pan en la página ya no hace falta
// resumir con "+N boquillas más".
function layoutBoquillas(n: number) {
  const nzW = 108, nzH = 40, nzGap = 14
  const totalNzH = n * nzH + Math.max(0, n - 1) * nzGap
  const topAnchored = n > 5
  const nzY0 = topAnchored
    ? MANIFOLD_Y - 10
    : MANIFOLD_Y + MANIFOLD_H / 2 - totalNzH / 2
  return { nzW, nzH, nzGap, totalNzH, nzY0, topAnchored }
}

// Alto total del SVG: el layout base necesita BASE_H; si la columna de boquillas
// (sin cap) crece más que eso, el lienzo crece para que nada quede cortado.
function alturaTotal(n: number): number {
  const { nzY0, totalNzH } = layoutBoquillas(n)
  return Math.max(BASE_H, nzY0 + totalNzH + 90)
}

// Tamaño natural del SVG para una entrada dada (sin renderizarlo) — usado por la
// página para calcular un zoom "ajustar a la ventana".
export function dimensionesBosquejo(e: EntradaInstalacion): { width: number; height: number } {
  const n = Math.max(1, Math.floor(e.nBoquillas || 1))
  return { width: W, height: alturaTotal(n) }
}

export function bosquejoSVG(e: EntradaInstalacion, r: Recomendacion, ctx?: BosquejoCtx): string {
  const boxW = 116, boxH = 56, pitch = 150, x0 = 16
  const yAire = 96, yAgua = 250
  const manifoldY = MANIFOLD_Y, manifoldH = MANIFOLD_H
  const ctrlY = CTRL_Y, ctrlH = CTRL_H

  const { aire, agua, mhky, sinEnergia } = construirLineas(e, r)

  const nCols = Math.max(aire.length, agua.length)
  const manifoldX = x0 + nCols * pitch + 6
  const manifoldW = 120

  // Marcadores de flecha + animación sutil de flujo (dash-offset) y pulso de las
  // electroválvulas — desactivada si el usuario prefiere menos movimiento.
  const defs = `<defs>
    <marker id="arrAire" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#0ea5e9"/></marker>
    <marker id="arrAgua" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#2563eb"/></marker>
  </defs>
  <style>
    .ins-caja rect { transition: stroke-width .12s ease, filter .12s ease; }
    .ins-caja a, .ins-caja a text { cursor: pointer; }
    .ins-caja.ins-hover rect, .ins-caja.ins-active rect { stroke-width: 3; }
    .ins-caja.ins-hover, .ins-caja.ins-active { filter: drop-shadow(0 0 5px rgba(37,99,235,.6)); }
    @keyframes insFlowAire { to { stroke-dashoffset: -22; } }
    @keyframes insFlowAgua { to { stroke-dashoffset: -28; } }
    @keyframes insPulseWire { 0%, 100% { opacity: 1; } 50% { opacity: .32; } }
    .flow-aire { animation: insFlowAire 1s linear infinite; }
    .flow-agua { animation: insFlowAgua 1.3s linear infinite; }
    .wire-elec { animation: insPulseWire 1.6s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .flow-aire, .flow-agua, .wire-elec { animation: none; }
    }
  </style>`

  function linea(items: Caja[], y: number, color: string, dash: string, marker: string, flowClass: string): string {
    let out = ""
    let prevRight = -1
    items.forEach((c, i) => {
      const x = x0 + i * pitch
      if (prevRight >= 0) {
        out += `<line x1="${prevRight}" y1="${y + boxH / 2}" x2="${x}" y2="${y + boxH / 2}" stroke="${color}" stroke-width="2.5" ${dash} class="${flowClass}" marker-end="url(#${marker})"/>`
      }
      out += caja(x, y, boxW, boxH, c, ctx)
      prevRight = x + boxW
    })
    // hacia el manifold
    out += `<line x1="${prevRight}" y1="${y + boxH / 2}" x2="${manifoldX}" y2="${y + boxH / 2}" stroke="${color}" stroke-width="2.5" ${dash} class="${flowClass}" marker-end="url(#${marker})"/>`
    return out
  }

  const svgAire = mhky ? "" : linea(aire, yAire, "#0ea5e9", 'stroke-dasharray="7 4"', "arrAire", "flow-aire")
  const svgAgua = linea(agua, yAgua, "#2563eb", 'stroke-dasharray="9 5"', "arrAgua", "flow-agua")

  // Manifold
  const manifoldInner = `<rect x="${manifoldX}" y="${manifoldY}" width="${manifoldW}" height="${manifoldH}" rx="10" fill="#0f172a"/>
    <text x="${manifoldX + manifoldW / 2}" y="${manifoldY + 46}" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">MANIFOLD</text>
    <text x="${manifoldX + manifoldW / 2}" y="${manifoldY + 66}" font-size="10.5" fill="#fbbf24" text-anchor="middle">${mhky ? "distribución agua" : "mezcla aire/agua"}</text>
    <text x="${manifoldX + manifoldW / 2}" y="${manifoldY + 82}" font-size="10.5" fill="#fbbf24" text-anchor="middle">${Math.max(1, e.nBoquillas)} salida(s)</text>
    ${badgeCircle(manifoldX, manifoldY, manifoldW, "MANIFOLD", ctx)}`
  const manifold = envolver("MANIFOLD", manifoldInner, ctx)

  // Boquillas — sin cap: se dibujan todas (n≤5 centradas junto al manifold como
  // antes; n>5 en columna creciente, navegable con el zoom/pan de la página).
  const n = Math.max(1, Math.floor(e.nBoquillas || 1))
  const { nzW, nzH, nzGap, nzY0 } = layoutBoquillas(n)
  const nzX = manifoldX + manifoldW + 40
  let boquillasCajas = ""
  for (let i = 0; i < n; i++) {
    const y = nzY0 + i * (nzH + nzGap)
    const nTag = `N${i + 1}`
    boquillasCajas += `<line x1="${manifoldX + manifoldW}" y1="${manifoldY + manifoldH / 2}" x2="${nzX}" y2="${y + nzH / 2}" stroke="#0f172a" stroke-width="2"/>`
    const nzInner = `<rect x="${nzX}" y="${y}" width="${nzW}" height="${nzH}" rx="7" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/>
      <text x="${nzX + nzW / 2}" y="${y + 17}" font-size="11" font-weight="700" fill="#92400e" text-anchor="middle">${nTag}</text>
      <text x="${nzX + nzW / 2}" y="${y + 32}" font-size="9.5" fill="#b45309" text-anchor="middle">boq. neblina</text>`
    boquillasCajas += envolver(nTag, nzInner, ctx)
  }
  const boquillas = envolver("NOZZLES", boquillasCajas, ctx)

  // Controlador + señales eléctricas a las electroválvulas
  const ctrlW = 300
  const ctrlX = manifoldX - ctrlW - 20
  const idxA5 = aire.length - 1, idxW5 = agua.length - 1
  const a5cx = x0 + idxA5 * pitch + boxW / 2
  const w5cx = x0 + idxW5 * pitch + boxW / 2
  const bandaY = (yAire + boxH + yAgua) / 2                 // banda vacía entre aire y agua
  const gapX = x0 + (nCols - 1) * pitch - (pitch - boxW) / 2 // hueco entre columnas (sin cajas)
  // La línea de aire baja por el hueco entre columnas para no cruzar la caja de agua.
  const wireA = mhky ? "" : `<polyline points="${a5cx},${yAire + boxH} ${a5cx},${bandaY} ${gapX},${bandaY} ${gapX},${ctrlY}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3" class="wire-elec"/>`
  const wireW = `<line x1="${w5cx}" y1="${yAgua + boxH}" x2="${w5cx}" y2="${ctrlY}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3" class="wire-elec"/>`
  const ctrlInner = `<rect x="${ctrlX}" y="${ctrlY}" width="${ctrlW}" height="${ctrlH}" rx="9" fill="#f3e8ff" stroke="#a855f7" stroke-width="1.5"/>
    <text x="${ctrlX + ctrlW / 2}" y="${ctrlY + 27}" font-size="12" font-weight="700" fill="#6b21a8" text-anchor="middle">CONTROLADOR · nodo de monitoreo</text>
    ${badgeCircle(ctrlX, ctrlY, ctrlW, "CONTROLADOR", ctx)}`
  const controlador = `${wireA}${wireW}${envolver("CONTROLADOR", ctrlInner, ctx)}`

  // Leyenda
  const leg = `<g font-size="11" fill="#475569">
    <line x1="${W - 300}" y1="30" x2="${W - 270}" y2="30" stroke="#0ea5e9" stroke-width="2.5" stroke-dasharray="7 4"/>
    <text x="${W - 264}" y="34">Aire comprimido</text>
    <line x1="${W - 160}" y1="30" x2="${W - 130}" y2="30" stroke="#2563eb" stroke-width="2.5"/>
    <text x="${W - 124}" y="34">Agua</text>
    <line x1="${W - 300}" y1="50" x2="${W - 270}" y2="50" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3"/>
    <text x="${W - 264}" y="54">Alimentación válvulas 230V</text>
  </g>`

  const etiqAire = mhky ? "" : `<text x="${x0}" y="${yAire - 12}" font-size="12" font-weight="700" fill="#0ea5e9">LÍNEA DE AIRE</text>`
  const etiqAgua = `<text x="${x0}" y="${yAgua - 12}" font-size="12" font-weight="700" fill="#2563eb">LÍNEA DE AGUA</text>`

  const genNote = sinEnergia
    ? envolver("GENERADOR", `<rect x="${ctrlX}" y="${ctrlY + ctrlH + 8}" width="${ctrlW}" height="30" rx="7" fill="#fff7ed" stroke="#f97316" stroke-width="1.3"/><text x="${ctrlX + ctrlW / 2}" y="${ctrlY + ctrlH + 27}" font-size="10.5" font-weight="700" fill="#c2410c" text-anchor="middle">+ GENERADOR 14 kVA (sin energía en planta)</text>${badgeCircle(ctrlX, ctrlY + ctrlH + 8, ctrlW, "GENERADOR", ctx)}`, ctx)
    : ""

  const H = alturaTotal(n)
  const instrY = H - 34
  const instrNote = envolver("INSTRUMENTACION", `<text x="${x0}" y="${instrY}" font-size="9.5" fill="#64748b">Instrumentación: sensor de presión HK1100C + interruptor de nivel Exceline GFE-MV</text>`, ctx)

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:system-ui,Segoe UI,Arial,sans-serif">
    ${defs}
    <rect x="0" y="0" width="${W}" height="${H}" rx="12" fill="#f8fafc"/>
    ${leg}${etiqAire}${etiqAgua}
    ${svgAire}${svgAgua}${manifold}${boquillas}${controlador}${genNote}${instrNote}
    <text x="${nzX - 8}" y="${H - 12}" font-size="9.5" fill="#94a3b8" text-anchor="end">Nota :El alcance de nube se ha tomado, instalando las boquillas a 2m sobre el nivel del suelo.</text>
    <text x="${x0}" y="${H - 12}" font-size="9.5" fill="#94a3b8">Esquema referencial de conexión · no es plano de ingeniería</text>
  </svg>`
}
