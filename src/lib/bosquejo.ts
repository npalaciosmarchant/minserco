// Generador del bosquejo (SVG vectorial) de la instalación de nebulización.
// Fuente única: se usa tanto en la página como en el informe PDF.

import { EntradaInstalacion, Recomendacion } from "./instalacion-utils"

interface Caja { tag: string; label: string; sub?: string; tipo: "linea" | "bomba" }

function caja(x: number, y: number, w: number, h: number, c: Caja): string {
  const stroke = c.tipo === "bomba" ? "#4f46e5" : "#1d4ed8"
  const fill = c.tipo === "bomba" ? "#eef2ff" : "#ffffff"
  const tag = `<text x="${x + 10}" y="${y + 22}" font-size="12" font-weight="700" fill="#0f172a">${c.tag} · ${c.label}</text>`
  const sub = c.sub ? `<text x="${x + 10}" y="${y + 40}" font-size="10.5" fill="#64748b">${c.sub}</text>` : ""
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>${tag}${sub}`
}


export function bosquejoSVG(e: EntradaInstalacion, r: Recomendacion): string {
  const W = 1200
  const boxW = 116, boxH = 56, pitch = 150, x0 = 16
  const yAire = 96, yAgua = 250

  const sinAire = e.aireEnPlanta === false
  const sinAgua = e.aguaEnPlanta === false
  const regAgua = !sinAgua && r.setAgua != null && e.presionAgua > (r.setAgua as number) + 0.05
  const regAire = !sinAire && r.setAire != null && e.presionAire > (r.setAire as number) + 0.05
  const necesitaBomba = !sinAgua && r.ok && r.setAgua != null && e.presionAgua < (r.setAgua as number) - 1e-6

  // Componentes de cada línea (izq → der)
  const aire: Caja[] = [
    sinAire
      ? { tag: "A0", label: "Compresor", sub: `${r.setAire ?? "—"} bar`, tipo: "bomba" }
      : { tag: "A1", label: "Toma aire", sub: "acople rápido", tipo: "linea" },
    { tag: "A2", label: "Válv. bola", sub: "corte manual", tipo: "linea" },
    { tag: "A3", label: "Filtro aire", sub: "de línea", tipo: "linea" },
  ]
  if (regAire) aire.push({ tag: "A4", label: "Regulador", sub: `ajustar ${r.setAire} bar`, tipo: "linea" })
  aire.push({ tag: "A5", label: "Válv. solen.", sub: "230V · a nodo", tipo: "linea" })

  const agua: Caja[] = [
    sinAgua
      ? { tag: "W0", label: "Estanque+bomba", sub: "SBI 4-16", tipo: "bomba" }
      : { tag: "W1", label: "Toma agua", sub: "matriz", tipo: "linea" },
    { tag: "W2", label: "Válv. bola", sub: "corte manual", tipo: "linea" },
  ]
  if (necesitaBomba) agua.push({ tag: "WB", label: "Bomba", sub: "booster SBI 4-16", tipo: "bomba" })
  agua.push({ tag: "W3", label: "Filtro agua", sub: "de línea", tipo: "linea" })
  if (regAgua) agua.push({ tag: "W4", label: "Regulador", sub: `ajustar ${r.setAgua} bar`, tipo: "linea" })
  agua.push({ tag: "W5", label: "Válv. solen.", sub: "230V · a nodo", tipo: "linea" })

  const nCols = Math.max(aire.length, agua.length)
  const manifoldX = x0 + nCols * pitch + 6
  const manifoldW = 120

  // Marcadores de flecha
  const defs = `<defs>
    <marker id="arrAire" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#0ea5e9"/></marker>
    <marker id="arrAgua" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#2563eb"/></marker>
  </defs>`

  function linea(items: Caja[], y: number, color: string, dash: string, marker: string): string {
    let out = ""
    let prevRight = -1
    items.forEach((c, i) => {
      const x = x0 + i * pitch
      if (prevRight >= 0) {
        out += `<line x1="${prevRight}" y1="${y + boxH / 2}" x2="${x}" y2="${y + boxH / 2}" stroke="${color}" stroke-width="2.5" ${dash} marker-end="url(#${marker})"/>`
      }
      out += caja(x, y, boxW, boxH, c)
      prevRight = x + boxW
    })
    // hacia el manifold
    out += `<line x1="${prevRight}" y1="${y + boxH / 2}" x2="${manifoldX}" y2="${y + boxH / 2}" stroke="${color}" stroke-width="2.5" ${dash} marker-end="url(#${marker})"/>`
    return out
  }

  const svgAire = linea(aire, yAire, "#0ea5e9", 'stroke-dasharray="7 4"', "arrAire")
  const svgAgua = linea(agua, yAgua, "#2563eb", "", "arrAgua")

  // Manifold
  const manifoldY = 150, manifoldH = 120
  const manifold = `<rect x="${manifoldX}" y="${manifoldY}" width="${manifoldW}" height="${manifoldH}" rx="10" fill="#0f172a"/>
    <text x="${manifoldX + manifoldW / 2}" y="${manifoldY + 46}" font-size="13" font-weight="800" fill="#ffffff" text-anchor="middle">MANIFOLD</text>
    <text x="${manifoldX + manifoldW / 2}" y="${manifoldY + 66}" font-size="10.5" fill="#fbbf24" text-anchor="middle">mezcla aire/agua</text>
    <text x="${manifoldX + manifoldW / 2}" y="${manifoldY + 82}" font-size="10.5" fill="#fbbf24" text-anchor="middle">${Math.max(1, e.nBoquillas)} salida(s)</text>`

  // Boquillas (máx 5 visibles + resto)
  const n = Math.max(1, Math.floor(e.nBoquillas || 1))
  const visibles = Math.min(n, 5)
  const nzX = manifoldX + manifoldW + 40
  const nzW = 108, nzH = 40, nzGap = 14
  const totalNzH = visibles * nzH + (visibles - 1) * nzGap
  const nzY0 = manifoldY + manifoldH / 2 - totalNzH / 2
  let boquillas = ""
  for (let i = 0; i < visibles; i++) {
    const y = nzY0 + i * (nzH + nzGap)
    boquillas += `<line x1="${manifoldX + manifoldW}" y1="${manifoldY + manifoldH / 2}" x2="${nzX}" y2="${y + nzH / 2}" stroke="#0f172a" stroke-width="2"/>`
    boquillas += `<rect x="${nzX}" y="${y}" width="${nzW}" height="${nzH}" rx="7" fill="#fef3c7" stroke="#f59e0b" stroke-width="1.5"/>`
    boquillas += `<text x="${nzX + nzW / 2}" y="${y + 17}" font-size="11" font-weight="700" fill="#92400e" text-anchor="middle">N${i + 1}</text>`
    boquillas += `<text x="${nzX + nzW / 2}" y="${y + 32}" font-size="9.5" fill="#b45309" text-anchor="middle">boq. neblina</text>`
  }
  if (n > visibles) {
    boquillas += `<text x="${nzX + nzW / 2}" y="${nzY0 + totalNzH + 16}" font-size="10.5" font-weight="600" fill="#92400e" text-anchor="middle">+${n - visibles} boquilla(s) más</text>`
  }

  // Controlador + señales eléctricas a las electroválvulas
  const ctrlY = 340, ctrlW = 300, ctrlH = 44
  const ctrlX = manifoldX - ctrlW - 20
  const idxA5 = aire.length - 1, idxW5 = agua.length - 1
  const a5cx = x0 + idxA5 * pitch + boxW / 2
  const w5cx = x0 + idxW5 * pitch + boxW / 2
  const controlador = `<rect x="${ctrlX}" y="${ctrlY}" width="${ctrlW}" height="${ctrlH}" rx="9" fill="#f3e8ff" stroke="#a855f7" stroke-width="1.5"/>
    <text x="${ctrlX + ctrlW / 2}" y="${ctrlY + 27}" font-size="12" font-weight="700" fill="#6b21a8" text-anchor="middle">CONTROLADOR · nodo de monitoreo</text>
    <line x1="${a5cx}" y1="${yAire + boxH}" x2="${a5cx}" y2="${ctrlY}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3"/>
    <line x1="${w5cx}" y1="${yAgua}" x2="${w5cx}" y2="${ctrlY}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3"/>`

  // Leyenda
  const leg = `<g font-size="11" fill="#475569">
    <line x1="${W - 300}" y1="30" x2="${W - 270}" y2="30" stroke="#0ea5e9" stroke-width="2.5" stroke-dasharray="7 4"/>
    <text x="${W - 264}" y="34">Aire comprimido</text>
    <line x1="${W - 160}" y1="30" x2="${W - 130}" y2="30" stroke="#2563eb" stroke-width="2.5"/>
    <text x="${W - 124}" y="34">Agua</text>
    <line x1="${W - 300}" y1="50" x2="${W - 270}" y2="50" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3"/>
    <text x="${W - 264}" y="54">Alimentación válvulas 230V</text>
  </g>`

  const etiqAire = `<text x="${x0}" y="${yAire - 12}" font-size="12" font-weight="700" fill="#0ea5e9">LÍNEA DE AIRE</text>`
  const etiqAgua = `<text x="${x0}" y="${yAgua - 12}" font-size="12" font-weight="700" fill="#2563eb">LÍNEA DE AGUA</text>`

  const H = 420
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:system-ui,Segoe UI,Arial,sans-serif">
    ${defs}
    <rect x="0" y="0" width="${W}" height="${H}" rx="12" fill="#f8fafc"/>
    ${leg}${etiqAire}${etiqAgua}
    ${svgAire}${svgAgua}${manifold}${boquillas}${controlador}
    <text x="${nzX - 8}" y="${H - 12}" font-size="9.5" fill="#94a3b8" text-anchor="end">Nota :El alcance de nube se ha tomado, instalando las boquillas a 2m sobre el nivel del suelo.</text>
    <text x="${x0}" y="${H - 12}" font-size="9.5" fill="#94a3b8">Esquema referencial de conexión · no es plano de ingeniería</text>
  </svg>`
}
