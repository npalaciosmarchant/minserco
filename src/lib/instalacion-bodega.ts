// Cruce entre el bosquejo de instalación y los módulos de Bodega y Equipos:
// para cada componente del dibujo (tag de bosquejo.ts / cajaTags de instalacion-utils.ts)
// determina si existe un ítem coincidente en bodega (stock de repuestos/consumibles) y/o
// en equipos (activo físico registrado, con foto/fichas técnicas), y arma links reales
// hacia esas fichas para que el bosquejo (y el PDF exportado) los muestren como hipervínculos.

import { ItemBodega, Equipo } from "./types"
import { BosquejoCtx, EstadoStock } from "./bosquejo"

// Palabras clave por tag del bosquejo. Se buscan (sin tildes, minúsculas) en los
// campos de texto de cada módulo. Los tags que no tienen palabras clave (ej. A1
// toma de aire, W2 válvula de bola) no se cruzan con bodega/equipos.
const KEYWORDS: Record<string, string[]> = {
  A0: ["compresor"],
  A3: ["filtro aire", "filtro de aire", "frl"],
  A4: ["regulador", "reductor de presion", "rinox"],
  A5: ["valvula solenoide", "electrovalvula", "solenoide"],
  W0: ["estanque", "bomba"],
  WB: ["bomba booster", "bomba"],
  W3: ["filtro agua", "filtro de agua", "filtro de linea"],
  W4: ["regulador", "reductor de presion", "rinox"],
  W5: ["valvula solenoide", "electrovalvula", "solenoide"],
  MANIFOLD: ["manifold"],
  NOZZLES: ["boquilla", "turbofog", "mhky", "nebuliz"],
  CONTROLADOR: ["controlador", "maxifog", "tablero de control"],
  GENERADOR: ["generador"],
  INSTRUMENTACION: ["sensor de presion", "interruptor de nivel", "nivel"],
}

// Las boquillas individuales del dibujo (N1, N2, ...) son variaciones del mismo
// tag "NOZZLES" (no hay un ítem de catálogo distinto por cada una); se agrupan
// para que el detalle, el cruce con bodega/equipos y el link sean los mismos.
export function normalizarCajaTag(tag: string): string {
  return /^N\d+$/.test(tag) ? "NOZZLES" : tag
}

export interface MatchBodega {
  item: ItemBodega
  estado: EstadoStock
}

export interface MatchComponente {
  bodega: MatchBodega | null
  equipo: Equipo | null
  // Estado representativo para el badge del bosquejo: el de bodega si hay match ahí
  // (stock real); si no, "registrado" cuando existe como activo en Equipos; si no,
  // "no-encontrado".
  estado: EstadoStock
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function estadoDe(item: ItemBodega): EstadoStock {
  if (item.cantidad <= 0) return "sin-stock"
  if (item.cantidadMinima != null && item.cantidad <= item.cantidadMinima) return "stock-bajo"
  return "en-stock"
}

export function buscarComponente(tagCrudo: string, bodegaItems: ItemBodega[], equiposItems: Equipo[]): MatchComponente {
  const tag = normalizarCajaTag(tagCrudo)
  const kws = (KEYWORDS[tag] ?? []).map(norm)
  if (kws.length === 0) return { bodega: null, equipo: null, estado: "no-encontrado" }

  const bMatch = bodegaItems.find(i => {
    const txt = norm(`${i.nombre} ${i.descripcion ?? ""} ${i.codigo ?? ""}`)
    return kws.some(k => txt.includes(k))
  })
  const eMatch = equiposItems.find(e => {
    const txt = norm(`${e.nombre} ${e.tipo ?? ""} ${e.marca ?? ""} ${e.modelo ?? ""} ${e.notas ?? ""}`)
    return kws.some(k => txt.includes(k))
  })

  const bodega = bMatch ? { item: bMatch, estado: estadoDe(bMatch) } : null
  const estado: EstadoStock = bodega ? bodega.estado : eMatch ? "registrado" : "no-encontrado"
  return { bodega, equipo: eMatch ?? null, estado }
}

// Arma el contexto (estado + links) que bosquejoSVG usa para pintar cada caja.
// `origin` debe ser un origen absoluto (window.location.origin) para que el link
// funcione también dentro de la ventana de impresión/PDF.
export function construirCtxBosquejo(bodegaItems: ItemBodega[], equiposItems: Equipo[], origin: string): BosquejoCtx {
  const stockPorTag: NonNullable<BosquejoCtx["stockPorTag"]> = {}
  const linkPorTag: NonNullable<BosquejoCtx["linkPorTag"]> = {}
  for (const tag of Object.keys(KEYWORDS)) {
    const match = buscarComponente(tag, bodegaItems, equiposItems)
    if (match.estado !== "no-encontrado") stockPorTag[tag] = { estado: match.estado }
    if (match.bodega) linkPorTag[tag] = `${origin}/bodega?buscar=${encodeURIComponent(match.bodega.item.codigo || match.bodega.item.nombre)}`
    else if (match.equipo) linkPorTag[tag] = `${origin}/equipos?id=${encodeURIComponent(match.equipo.id)}`
  }
  return { stockPorTag, linkPorTag }
}
