// Cruce entre el bosquejo de instalación y el inventario de bodega:
// para cada componente del dibujo (tag de bosquejo.ts / cajaTags de instalacion-utils.ts)
// determina si existe un ítem coincidente en bodega y su estado de stock, y arma un link
// hacia esa ficha para que el bosquejo (y el PDF exportado) lo muestren como hipervínculo real.

import { ItemBodega } from "./types"
import { BosquejoCtx, EstadoStock } from "./bosquejo"

// Palabras clave por tag del bosquejo. Se buscan (sin tildes, minúsculas) en
// nombre / descripción / código del ítem de bodega. Los tags que no tienen
// palabras clave (ej. A1 toma de aire, W2 válvula de bola) no se cruzan con bodega.
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

export interface MatchBodega {
  item: ItemBodega | null
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

export function buscarEnBodega(tag: string, items: ItemBodega[]): MatchBodega {
  const kws = (KEYWORDS[tag] ?? []).map(norm)
  if (kws.length === 0) return { item: null, estado: "no-encontrado" }
  const match = items.find(i => {
    const txt = norm(`${i.nombre} ${i.descripcion ?? ""} ${i.codigo ?? ""}`)
    return kws.some(k => txt.includes(k))
  })
  if (!match) return { item: null, estado: "no-encontrado" }
  return { item: match, estado: estadoDe(match) }
}

// Arma el contexto (estado de stock + links) que bosquejoSVG usa para pintar cada caja.
// `origin` debe ser un origen absoluto (window.location.origin) para que el link
// funcione también dentro de la ventana de impresión/PDF.
export function construirCtxBosquejo(items: ItemBodega[], origin: string): BosquejoCtx {
  const stockPorTag: NonNullable<BosquejoCtx["stockPorTag"]> = {}
  const linkPorTag: NonNullable<BosquejoCtx["linkPorTag"]> = {}
  for (const tag of Object.keys(KEYWORDS)) {
    const { item, estado } = buscarEnBodega(tag, items)
    if (estado !== "no-encontrado") stockPorTag[tag] = { estado }
    if (item) linkPorTag[tag] = `${origin}/bodega?buscar=${encodeURIComponent(item.codigo || item.nombre)}`
  }
  return { stockPorTag, linkPorTag }
}
