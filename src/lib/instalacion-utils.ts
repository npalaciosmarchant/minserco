// Motor de cálculo del módulo de Instalación (nebulización aire-agua Turbofog)
// Basado en las fichas técnicas Minserco: tablas Turbofog Ø0,8mm y Ø1mm,
// electroválvulas EV, bomba STAIRS SBI 4-16 y válvula solenoide.

export type BoquillaTipo = "0.8" | "1" | "auto"
export type Objetivo = "alcance" | "fina" | "ahorro"

export interface FilaTurbofog {
  pAire: number      // presión de aire en boquilla (bar)
  pAgua: number      // presión de agua en boquilla (bar)
  aireM3h: number    // consumo de aire libre por boquilla (m3/h)
  aguaLh: number     // caudal de agua por boquilla (l/h)
  alcanceM: number   // alcance de nube (m)
  gotaUm: number     // tamaño de gota medio (micras)
}

// Ø 0,8 mm (con válvula antigoteo). Se omiten las posiciones "no trabajar".
export const TURBOFOG_08: FilaTurbofog[] = [
  { pAire: 0.5, pAgua: 1.5, aireM3h: 0.40, aguaLh: 1.32, alcanceM: 2.5, gotaUm: 17 },
  { pAire: 0.5, pAgua: 2,   aireM3h: 0.23, aguaLh: 3.12, alcanceM: 3,   gotaUm: 48 },
  { pAire: 0.5, pAgua: 3,   aireM3h: 0.13, aguaLh: 5.49, alcanceM: 3,   gotaUm: 71 },
  { pAire: 0.5, pAgua: 4,   aireM3h: 0.11, aguaLh: 6.84, alcanceM: 2.5, gotaUm: 80 },
  { pAire: 1,   pAgua: 1.5, aireM3h: 0.47, aguaLh: 1.92, alcanceM: 4,   gotaUm: 18 },
  { pAire: 1,   pAgua: 2,   aireM3h: 0.31, aguaLh: 3.84, alcanceM: 3.5, gotaUm: 61 },
  { pAire: 1,   pAgua: 3,   aireM3h: 0.25, aguaLh: 5.40, alcanceM: 3.5, gotaUm: 80 },
  { pAire: 1,   pAgua: 4,   aireM3h: 0.21, aguaLh: 6.84, alcanceM: 3.5, gotaUm: 94 },
  { pAire: 1,   pAgua: 5,   aireM3h: 0.18, aguaLh: 8.40, alcanceM: 3.5, gotaUm: 105 },
  { pAire: 1.5, pAgua: 1.6, aireM3h: 0.58, aguaLh: 2.10, alcanceM: 5.5, gotaUm: 17 },
  { pAire: 1.5, pAgua: 2,   aireM3h: 0.52, aguaLh: 3.06, alcanceM: 6,   gotaUm: 32 },
  { pAire: 1.5, pAgua: 3,   aireM3h: 0.41, aguaLh: 5.07, alcanceM: 6.5, gotaUm: 62 },
  { pAire: 1.5, pAgua: 4,   aireM3h: 0.34, aguaLh: 6.52, alcanceM: 6,   gotaUm: 74 },
  { pAire: 1.5, pAgua: 5,   aireM3h: 0.29, aguaLh: 7.90, alcanceM: 5.5, gotaUm: 86 },
  { pAire: 1.5, pAgua: 6,   aireM3h: 0.25, aguaLh: 9.36, alcanceM: 5,   gotaUm: 96 },
  { pAire: 2,   pAgua: 2.5, aireM3h: 0.71, aguaLh: 3.00, alcanceM: 7,   gotaUm: 19 },
  { pAire: 2,   pAgua: 3,   aireM3h: 0.58, aguaLh: 4.14, alcanceM: 7,   gotaUm: 39 },
  { pAire: 2,   pAgua: 4,   aireM3h: 0.47, aguaLh: 5.94, alcanceM: 7,   gotaUm: 58 },
  { pAire: 2,   pAgua: 5,   aireM3h: 0.40, aguaLh: 7.46, alcanceM: 6.5, gotaUm: 77 },
  { pAire: 2,   pAgua: 6,   aireM3h: 0.35, aguaLh: 8.61, alcanceM: 6.5, gotaUm: 84 },
  { pAire: 2.5, pAgua: 3,   aireM3h: 0.80, aguaLh: 3.18, alcanceM: 7.5, gotaUm: 17 },
  { pAire: 2.5, pAgua: 4,   aireM3h: 0.67, aguaLh: 5.31, alcanceM: 8,   gotaUm: 43 },
  { pAire: 2.5, pAgua: 5,   aireM3h: 0.57, aguaLh: 7.02, alcanceM: 7.5, gotaUm: 60 },
  { pAire: 2.5, pAgua: 6,   aireM3h: 0.50, aguaLh: 8.10, alcanceM: 7.5, gotaUm: 71 },
]

// Ø 1 mm (con válvula antigoteo).
export const TURBOFOG_1: FilaTurbofog[] = [
  { pAire: 0.5, pAgua: 2,   aireM3h: 0.69, aguaLh: 2.04, alcanceM: 5.5, gotaUm: 15 },
  { pAire: 0.5, pAgua: 3,   aireM3h: 0.54, aguaLh: 4.32, alcanceM: 4.5, gotaUm: 47 },
  { pAire: 0.5, pAgua: 4,   aireM3h: 0.45, aguaLh: 5.97, alcanceM: 4,   gotaUm: 60 },
  { pAire: 1,   pAgua: 1.5, aireM3h: 1.27, aguaLh: 1.44, alcanceM: 7,   gotaUm: 4 },
  { pAire: 1,   pAgua: 2,   aireM3h: 0.98, aguaLh: 2.94, alcanceM: 7,   gotaUm: 11 },
  { pAire: 1,   pAgua: 3,   aireM3h: 0.78, aguaLh: 4.74, alcanceM: 7,   gotaUm: 31 },
  { pAire: 1,   pAgua: 4,   aireM3h: 0.68, aguaLh: 6.48, alcanceM: 6.5, gotaUm: 50 },
  { pAire: 1,   pAgua: 5,   aireM3h: 0.63, aguaLh: 7.65, alcanceM: 6.5, gotaUm: 60 },
  { pAire: 1.5, pAgua: 1.6, aireM3h: 1.59, aguaLh: 1.50, alcanceM: 7,   gotaUm: 3 },
  { pAire: 1.5, pAgua: 2,   aireM3h: 1.28, aguaLh: 3.18, alcanceM: 7.5, gotaUm: 9 },
  { pAire: 1.5, pAgua: 3,   aireM3h: 1.08, aguaLh: 5.10, alcanceM: 7.5, gotaUm: 22 },
  { pAire: 1.5, pAgua: 4,   aireM3h: 0.96, aguaLh: 6.66, alcanceM: 7.5, gotaUm: 38 },
  { pAire: 1.5, pAgua: 5,   aireM3h: 0.87, aguaLh: 7.98, alcanceM: 7,   gotaUm: 47 },
  { pAire: 1.5, pAgua: 6,   aireM3h: 0.82, aguaLh: 9.06, alcanceM: 7,   gotaUm: 54 },
  { pAire: 2,   pAgua: 2.5, aireM3h: 1.65, aguaLh: 3.09, alcanceM: 8,   gotaUm: 7 },
  { pAire: 2,   pAgua: 3,   aireM3h: 1.46, aguaLh: 4.44, alcanceM: 8,   gotaUm: 11 },
  { pAire: 2,   pAgua: 4,   aireM3h: 1.26, aguaLh: 6.06, alcanceM: 8,   gotaUm: 23 },
  { pAire: 2,   pAgua: 5,   aireM3h: 1.10, aguaLh: 7.42, alcanceM: 8,   gotaUm: 35 },
  { pAire: 2,   pAgua: 6,   aireM3h: 1.01, aguaLh: 8.70, alcanceM: 8,   gotaUm: 44 },
  { pAire: 2.5, pAgua: 3,   aireM3h: 1.88, aguaLh: 3.12, alcanceM: 8.5, gotaUm: 5 },
  { pAire: 2.5, pAgua: 4,   aireM3h: 1.60, aguaLh: 5.25, alcanceM: 8.5, gotaUm: 14 },
  { pAire: 2.5, pAgua: 5,   aireM3h: 1.41, aguaLh: 6.78, alcanceM: 8.5, gotaUm: 23 },
  { pAire: 2.5, pAgua: 6,   aireM3h: 1.27, aguaLh: 8.22, alcanceM: 8.5, gotaUm: 32 },
]

// Electroválvulas EV (cuerpo bronce, NC-NA). capacidad en l/min, presión máx en bar.
export interface FilaEV { codigo: string; medida: string; accion: string; capacidadLmin: number; pMaxBar: number }
export const TABLA_EV: FilaEV[] = [
  { codigo: "EV04", medida: '1/4"',   accion: "directo",  capacidadLmin: 3.2,   pMaxBar: 10 },
  { codigo: "EV06", medida: '3/8"',   accion: "indirecto", capacidadLmin: 38,    pMaxBar: 20 },
  { codigo: "EV08", medida: '1/2"',   accion: "indirecto", capacidadLmin: 38,    pMaxBar: 20 },
  { codigo: "EV12", medida: '3/4"',   accion: "indirecto", capacidadLmin: 50,    pMaxBar: 16 },
  { codigo: "EV16", medida: '1"',     accion: "indirecto", capacidadLmin: 190,   pMaxBar: 16 },
  { codigo: "EV24", medida: '1.1/2"', accion: "indirecto", capacidadLmin: 520,   pMaxBar: 10 },
  { codigo: "EV32", medida: '2"',     accion: "indirecto", capacidadLmin: 750,   pMaxBar: 10 },
]

// ── Reglas por defecto (ajustables a futuro) ─────────────────────────────────
export const DEFAULTS = {
  voltaje: "230V",
  filtroAire: "de línea",
  filtroAgua: "de línea",
  bombaModelo: "STAIRS SBI 4-16",
  bombaCaudalLmin: 83,
  estanqueLitros: 500,
  boquillaDefault: "0.8" as BoquillaTipo,
  margenValvula: 1.2, // 20% de margen al dimensionar electroválvula
}

function elegirEV(flujoLmin: number): FilaEV {
  const req = flujoLmin * DEFAULTS.margenValvula
  const ev = TABLA_EV.find(e => e.capacidadLmin >= req)
  return ev ?? TABLA_EV[TABLA_EV.length - 1]
}

export interface EntradaInstalacion {
  presionAire: number      // bar disponible en terreno
  presionAgua: number      // bar disponible en terreno
  nBoquillas: number
  boquillaTipo: BoquillaTipo
  objetivo: Objetivo
  aireEnPlanta?: boolean   // ¿la planta cuenta con aire comprimido? (default true)
  aguaEnPlanta?: boolean   // ¿la planta cuenta con agua? (default true)
  largoCorrea?: number     // m (opcional, para sugerir N)
  espaciamiento?: number   // m entre boquillas (opcional)
}

export interface ItemReco { texto: string; detalle?: string }

export interface Recomendacion {
  ok: boolean
  boquillaElegida: "0.8" | "1"
  fila: FilaTurbofog | null
  aguaTotalLmin: number
  aireTotalM3h: number
  aporteFrioTotal: number   // frigorías/h aprox
  nSugerido: number | null
  setAgua: number | null    // presión de agua a ajustar en boquilla (bar)
  setAire: number | null    // presión de aire a ajustar en boquilla (bar)
  evAgua: FilaEV | null
  evAire: FilaEV | null
  instalar: ItemReco[]
  noInstalar: ItemReco[]
  advertencias: string[]
  aireEnPlanta: boolean
  aguaEnPlanta: boolean
}

function tabla(tipo: "0.8" | "1"): FilaTurbofog[] {
  return tipo === "1" ? TURBOFOG_1 : TURBOFOG_08
}

// Elige la mejor fila alcanzable con las presiones disponibles según el objetivo.
function mejorFila(tipo: "0.8" | "1", pAire: number, pAgua: number, obj: Objetivo): FilaTurbofog | null {
  const cand = tabla(tipo).filter(f => f.pAire <= pAire + 1e-6 && f.pAgua <= pAgua + 1e-6)
  if (cand.length === 0) return null
  const sorted = [...cand].sort((a, b) => {
    if (obj === "fina")   return a.gotaUm - b.gotaUm
    if (obj === "ahorro") return a.aguaLh - b.aguaLh
    return b.alcanceM - a.alcanceM || b.aguaLh - a.aguaLh // alcance
  })
  return sorted[0]
}

function valvulaPara(linea: string, flujoLmin: number, ev: FilaEV): ItemReco {
  const pequenas = ["EV04", "EV06", "EV08"] // hasta ½" -> válvula solenoide Minserco
  if (pequenas.includes(ev.codigo)) {
    return { texto: `Válvula solenoide ${linea} Minserco ½" NPT (${DEFAULTS.voltaje})`, detalle: `caudal ${flujoLmin.toFixed(1)} L/min · filtro interno 20 µm · comunica a nodo (RS232)` }
  }
  return { texto: `Electroválvula ${linea} ${ev.codigo} (${ev.medida}) ${DEFAULTS.voltaje}`, detalle: `capacidad ${ev.capacidadLmin} L/min · bobina BB220CA + tripolar TP8W` }
}

export function recomendar(e: EntradaInstalacion): Recomendacion {
  const advertencias: string[] = []
  const instalar: ItemReco[] = []
  const noInstalar: ItemReco[] = []

  const n = Math.max(0, Math.floor(e.nBoquillas || 0))

  // Sugerencia de N° de boquillas según largo/espaciamiento
  let nSugerido: number | null = null
  if (e.largoCorrea && e.espaciamiento && e.espaciamiento > 0) {
    nSugerido = Math.max(1, Math.ceil(e.largoCorrea / e.espaciamiento))
  }

  // Elegir tipo de boquilla
  let tipo: "0.8" | "1" = e.boquillaTipo === "1" ? "1" : "0.8"
  if (e.boquillaTipo === "auto") tipo = "0.8"

  // ¿La planta cuenta con aire y/o agua? Si no, la fuente (compresor / estanque+bomba)
  // provee la presión de trabajo, así que para elegir el punto se usa todo el rango de tabla.
  const aireEnPlanta = e.aireEnPlanta !== false
  const aguaEnPlanta = e.aguaEnPlanta !== false
  const effAire = aireEnPlanta ? e.presionAire : 2.5
  const effAgua = aguaEnPlanta ? e.presionAgua : 6

  let fila = mejorFila(tipo, effAire, effAgua, e.objetivo)

  // Si la seleccionada no alcanza pero la otra sí, avisar
  if (!fila) {
    const otra = tipo === "0.8" ? "1" : "0.8"
    const filaOtra = mejorFila(otra as "0.8" | "1", effAire, effAgua, e.objetivo)
    if (filaOtra) advertencias.push(`Con la boquilla Ø${tipo}mm las presiones disponibles no alcanzan una posición de trabajo válida; la boquilla Ø${otra}mm sí funcionaría.`)
  }

  if (!fila) {
    // No hay punto de trabajo alcanzable: falta presión
    const minAgua = Math.min(...tabla(tipo).map(f => f.pAgua))
    const minAire = Math.min(...tabla(tipo).map(f => f.pAire))
    if (e.presionAgua < minAgua) {
      advertencias.push(`Presión de agua insuficiente: se necesitan al menos ${minAgua} bar en la boquilla (disponible ${e.presionAgua} bar).`)
      instalar.push({ texto: `Bomba booster ${DEFAULTS.bombaModelo} + estanque ${DEFAULTS.estanqueLitros} L`, detalle: "para elevar la presión de agua hasta el rango de trabajo" })
    }
    if (e.presionAire < minAire) {
      advertencias.push(`Presión de aire insuficiente: se necesitan al menos ${minAire} bar en la boquilla (disponible ${e.presionAire} bar).`)
      instalar.push({ texto: "Compresor de mayor presión/caudal", detalle: `mínimo ${minAire} bar en la línea de aire` })
    }
    return {
      ok: false, boquillaElegida: tipo, fila: null,
      aguaTotalLmin: 0, aireTotalM3h: 0, aporteFrioTotal: 0,
      nSugerido, setAgua: null, setAire: null, evAgua: null, evAire: null,
      instalar, noInstalar, advertencias,
      aireEnPlanta, aguaEnPlanta,
    }
  }

  // Consumos totales
  const aguaTotalLmin = +(n * fila.aguaLh / 60).toFixed(2)
  const aireTotalM3h = +(n * fila.aireM3h).toFixed(2)
  const aireTotalLmin = aireTotalM3h * 1000 / 60
  // Aporte de frío aprox: 539 kcal por kg de agua evaporada (1 l ≈ 1 kg)
  const aporteFrioTotal = Math.round(n * fila.aguaLh * 539)

  // Boquillas
  instalar.push({ texto: `${n} boquilla(s) Turbofog Ø${tipo}mm con válvula antigoteo`, detalle: `consumo total ${aguaTotalLmin} L/min de agua y ${aireTotalM3h} m³/h de aire` })

  // Regulador de agua (solo si hay agua en planta y la presión sobra)
  if (aguaEnPlanta && e.presionAgua > fila.pAgua + 0.05) {
    instalar.push({ texto: "Regulador de presión de agua", detalle: `ajustar a ${fila.pAgua} bar (disponible ${e.presionAgua} bar)` })
  }

  // Fuente de aire: compresor si NO hay aire en planta; si hay y sobra, regulador
  if (!aireEnPlanta) {
    instalar.push({ texto: "Compresor de aire", detalle: `no hay aire en planta: debe entregar ${fila.pAire} bar y ~${aireTotalM3h} m³/h` })
  } else if (e.presionAire > fila.pAire + 0.05) {
    instalar.push({ texto: "Regulador de presión de aire", detalle: `ajustar a ${fila.pAire} bar (disponible ${e.presionAire} bar)` })
  }

  // Filtros estándar
  instalar.push({ texto: "Filtro de aire de línea", detalle: "protege las boquillas y la válvula" })
  instalar.push({ texto: "Filtro de agua de línea", detalle: "la válvula solenoide trae filtro interno de 20 µm (ficha técnica)" })

  // Válvulas de línea (agua y aire)
  const evAgua = elegirEV(aguaTotalLmin)
  const evAire = elegirEV(aireTotalLmin)
  instalar.push(valvulaPara("agua", aguaTotalLmin, evAgua))
  instalar.push(valvulaPara("aire", aireTotalLmin, evAire))

  // Manifold y controlador
  instalar.push({ texto: `Manifold de mezcla aire/agua con ${Math.max(1, n)} salida(s)` })
  instalar.push({ texto: `Controlador / nodo de monitoreo ${DEFAULTS.voltaje}`, detalle: "comanda las electroválvulas y reporta estado" })

  // Fuente de agua
  const bombaOk = aguaTotalLmin <= DEFAULTS.bombaCaudalLmin
  const hayBomba = !aguaEnPlanta || e.presionAgua < fila.pAgua - 1e-6
  if (!aguaEnPlanta) {
    if (bombaOk) {
      instalar.push({ texto: `Estanque de agua ${DEFAULTS.estanqueLitros} L + bomba ${DEFAULTS.bombaModelo}`, detalle: `no hay agua en planta: almacenar y presurizar a ${fila.pAgua} bar · ${DEFAULTS.bombaCaudalLmin} L/min` })
    } else {
      instalar.push({ texto: `Estanque de agua + bomba de mayor caudal (>${aguaTotalLmin} L/min)`, detalle: `la ${DEFAULTS.bombaModelo} (${DEFAULTS.bombaCaudalLmin} L/min) queda corta` })
      advertencias.push(`El caudal total (${aguaTotalLmin} L/min) supera la capacidad de la bomba ${DEFAULTS.bombaModelo} (${DEFAULTS.bombaCaudalLmin} L/min).`)
    }
  } else if (e.presionAgua < fila.pAgua - 1e-6) {
    if (bombaOk) {
      instalar.push({ texto: `Bomba booster ${DEFAULTS.bombaModelo} + estanque ${DEFAULTS.estanqueLitros} L`, detalle: `presión de agua insuficiente (${e.presionAgua} < ${fila.pAgua} bar); entrega ${DEFAULTS.bombaCaudalLmin} L/min` })
    } else {
      instalar.push({ texto: `Bomba de mayor caudal (>${aguaTotalLmin} L/min) + estanque`, detalle: `la ${DEFAULTS.bombaModelo} (${DEFAULTS.bombaCaudalLmin} L/min) queda corta` })
      advertencias.push(`El caudal total (${aguaTotalLmin} L/min) supera la capacidad de la bomba ${DEFAULTS.bombaModelo} (${DEFAULTS.bombaCaudalLmin} L/min).`)
    }
  } else {
    noInstalar.push({ texto: "Bomba booster / estanque", detalle: `hay agua en planta con presión suficiente (${e.presionAgua} bar ≥ ${fila.pAgua} bar)` })
  }

  // Compresor: no hace falta si hay aire en planta con presión suficiente
  if (aireEnPlanta && e.presionAire >= fila.pAire) {
    noInstalar.push({ texto: "Compresor", detalle: `hay aire en planta suficiente (${e.presionAire} bar ≥ ${fila.pAire} bar de trabajo)` })
  }

  // Boquillas extra por caudal (informativo respecto a bomba)
  if (hayBomba && bombaOk) {
    const margen = DEFAULTS.bombaCaudalLmin - aguaTotalLmin
    const extra = Math.floor(margen / (fila.aguaLh / 60))
    if (extra > 0) noInstalar.push({ texto: `Boquillas adicionales`, detalle: `con la bomba caben hasta ~${extra} boquilla(s) más antes de saturar el caudal` })
  }

  return {
    ok: true, boquillaElegida: tipo, fila,
    aguaTotalLmin, aireTotalM3h, aporteFrioTotal,
    nSugerido,
    setAgua: fila.pAgua, setAire: fila.pAire,
    evAgua, evAire,
    instalar, noInstalar, advertencias,
    aireEnPlanta, aguaEnPlanta,
  }
}
