// Motor de cálculo del módulo de Instalación (nebulización aire-agua Turbofog)
// Basado en las fichas técnicas Minserco: tablas Turbofog Ø0,8mm y Ø1mm,
// electroválvulas EV, bomba STAIRS SBI 4-16 y válvula solenoide.

export type BoquillaTipo = "0.8" | "1" | "auto"
export type SistemaBoquilla = "turbofog" | "mhky"
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

// ── Catálogo de estanques (fichas Bioplastic / Minserco / Tupel) ─────────────
export interface Estanque { litros: number; modelo: string; forma: "horizontal" | "vertical"; medidas: string }
export const ESTANQUES: Estanque[] = [
  { litros: 1100,  modelo: "Estanque horizontal 1.100 L",            forma: "horizontal", medidas: "1,17 × 1,60 × 1,0 m" },
  { litros: 5000,  modelo: "Estanque horizontal 5.000 L",            forma: "horizontal", medidas: "1,55 × 2,85 m · Ø1,43 m" },
  { litros: 10000, modelo: "Estanque vertical 10.000 L (EVS10000)",  forma: "vertical",   medidas: "Ø2,5 × 2,1 m" },
  { litros: 30000, modelo: "Estanque vertical 30.000 L (Tupel)",     forma: "vertical",   medidas: "Ø3,36 × 3,8 m" },
]
export function estanquePorLitros(l?: number): Estanque {
  return ESTANQUES.find(e => e.litros === l) ?? ESTANQUES[0]
}

// ── Catálogo de bombas (presión aprox = altura manométrica / 10,2) ───────────
export interface Bomba { modelo: string; hp: number; kw: number; caudalMaxLmin: number; presionMaxBar: number; uso: string }
export const BOMBAS: Bomba[] = [
  { modelo: "STAIRS SBI 4-16",         hp: 1.5, kw: 1.1, caudalMaxLmin: 83,   presionMaxBar: 5.5, uso: "booster multietapa" },
  { modelo: "REGGIO STO 150",          hp: 1.5, kw: 1.1, caudalMaxLmin: 160,  presionMaxBar: 4.8, uso: "multietapa alta presión" },
  { modelo: "REGGIO STO 200",          hp: 2.0, kw: 1.5, caudalMaxLmin: 160,  presionMaxBar: 6.0, uso: "multietapa alta presión" },
  { modelo: "REGGIO STO 300",          hp: 3.0, kw: 2.2, caudalMaxLmin: 160,  presionMaxBar: 7.3, uso: "multietapa alta presión" },
  { modelo: "REGGIO SCF (centrífuga)", hp: 3.0, kw: 2.2, caudalMaxLmin: 1200, presionMaxBar: 1.8, uso: "alto caudal / baja presión (trasvasije)" },
]
// Elige la bomba más chica que cubra el caudal y la presión pedidos (excluye la centrífuga de baja presión salvo que se pida por caudal).
export function elegirBomba(caudalLmin: number, presionBar: number): Bomba {
  const apta = BOMBAS.filter(b => b.caudalMaxLmin >= caudalLmin && b.presionMaxBar >= presionBar)
                     .sort((a, b) => a.caudalMaxLmin - b.caudalMaxLmin || a.hp - b.hp)
  return apta[0] ?? BOMBAS[BOMBAS.length - 1]
}
export function bombaPorModelo(m?: string): Bomba | null {
  if (!m || m === "auto") return null
  return BOMBAS.find(b => b.modelo === m) ?? null
}

// ── Modelos reales de cada componente (fichas técnicas entregadas) ───────────
export const COMPONENTES = {
  compresor:        "Compresor de tornillo KRATTO (inverter MAM-6080)",
  compresorPresion: "6–8 bar",
  generador:        "Generador diésel 14 kVA trifásico (13 kVA nom · 380V · autonomía >12 h)",
  filtroAire:       "Filtro de aire comprimido FRL-QBM1 (micro-automación)",
  filtroAgua:       "Filtro de línea RBM (cartucho 800 µm)",
  regulador:        "Reductor de presión RBM Rinox",
  solenoide:        'Válvula solenoide Minserco ½" NPT (bronce · filtro 20 µm · 230V · RS232)',
  controlador:      "Tablero MAXIFOG 30S / T-PCB02 (nodo de monitoreo)",
  sensorPresion:    "Sensor de presión HK1100C (0–12 bar · 5V · G¼)",
  interruptorNivel: "Interruptor de nivel Exceline GFE-MV (flotante IP68)",
}

// Regla RBM Rinox: la relación presión entrada/salida no debe superar 2,5 (cavitación).
export const RBM_RATIO_MAX = 2.5

// ── Boquilla MHKY 3/8 (cono 65°, solo-agua). Caudal L/min por código y presión (bar) ──
export interface FilaMHKY { codigo: string; pasoMm: number; cap: Record<number, number> }
export const MHKY: FilaMHKY[] = [
  { codigo: "6503", pasoMm: 1.1, cap: { 1: 0.68, 1.5: 0.83, 2: 0.97, 3: 1.2, 4: 1.4, 5: 1.5, 6: 1.7, 7: 1.8, 10: 2.2 } },
  { codigo: "6505", pasoMm: 1.4, cap: { 1: 1.1,  1.5: 1.3,  2: 1.6,  3: 2.0, 4: 2.3, 5: 2.5, 6: 2.8, 7: 3.0, 10: 3.6 } },
  { codigo: "6506", pasoMm: 1.6, cap: { 1: 1.4,  1.5: 1.7,  2: 1.9,  3: 2.4, 4: 2.7, 5: 3.1, 6: 3.3, 7: 3.6, 10: 4.3 } },
  { codigo: "6508", pasoMm: 1.8, cap: { 1: 1.8,  1.5: 2.2,  2: 2.6,  3: 3.2, 4: 3.6, 5: 4.1, 6: 4.5, 7: 4.8, 10: 5.8 } },
  { codigo: "6510", pasoMm: 2.0, cap: { 1: 2.3,  1.5: 2.8,  2: 3.2,  3: 3.9, 4: 4.6, 5: 5.1, 6: 5.6, 7: 6.0, 10: 7.2 } },
  { codigo: "6515", pasoMm: 2.4, cap: { 1: 3.4,  1.5: 4.2,  2: 4.8,  3: 5.9, 4: 6.6, 5: 7.6, 6: 8.4, 7: 9.0, 10: 10.8 } },
  { codigo: "6520", pasoMm: 2.8, cap: { 1: 4.6,  1.5: 5.6,  2: 6.5,  3: 7.9, 4: 9.1, 5: 10.2, 6: 11.2, 7: 12.1, 10: 14.4 } },
]
const MHKY_PRESIONES = [1, 1.5, 2, 3, 4, 5, 6, 7, 10]
export function mhkyCaudal(f: FilaMHKY, presion: number): number {
  // caudal a la mayor presión tabulada que no supere la disponible (mín 1 bar)
  const p = MHKY_PRESIONES.filter(x => x <= presion + 1e-6).pop() ?? 1
  return f.cap[p]
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
  sistema?: SistemaBoquilla   // "turbofog" (aire-agua) | "mhky" (solo-agua). default turbofog
  mhkyCodigo?: string         // código MHKY forzado (opcional; si no, auto por objetivo)
  aireEnPlanta?: boolean      // ¿la planta cuenta con aire comprimido? (default true)
  aguaEnPlanta?: boolean      // ¿la planta cuenta con agua? (default true)
  energiaEnPlanta?: boolean   // ¿hay energía eléctrica en planta? (default true)
  estanqueLitros?: number     // estanque elegido por el técnico (L). default 1100
  bombaModelo?: string        // bomba forzada por el técnico ("auto" = automática)
  largoCorrea?: number        // m (opcional, para sugerir N)
  espaciamiento?: number      // m entre boquillas (opcional)
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
  energiaEnPlanta: boolean
  sistema: SistemaBoquilla
  boquillaModelo: string
  estanque: Estanque
  bomba: Bomba | null
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
    return { texto: `Válvula solenoide ${linea} Minserco ½" NPT (bronce · 230V)`, detalle: `caudal ${flujoLmin.toFixed(1)} L/min · filtro interno 20 µm · Pmáx 20 bar · RS232 a nodo` }
  }
  return { texto: `Electroválvula ${linea} ${ev.codigo} (${ev.medida}) ${DEFAULTS.voltaje}`, detalle: `capacidad ${ev.capacidadLmin} L/min · bobina BB220CA + tripolar TP8W` }
}

// ── Fuente de agua (bomba + estanque) según necesidad. Devuelve la bomba elegida (o null). ──
function fuenteAgua(
  ctx: { aguaEnPlanta: boolean; presionAgua: number; setAgua: number; estanque: Estanque; bombaForzada: Bomba | null; caudalLmin: number },
  instalar: ItemReco[], noInstalar: ItemReco[], advertencias: string[],
): Bomba | null {
  const { aguaEnPlanta, presionAgua, setAgua, estanque, bombaForzada, caudalLmin } = ctx
  const needPump = !aguaEnPlanta || presionAgua < setAgua - 1e-6
  if (!needPump) {
    noInstalar.push({ texto: "Bomba booster / estanque", detalle: `hay agua en planta con presión suficiente (${presionAgua} bar >= ${setAgua} bar)` })
    return null
  }
  const bomba = bombaForzada ?? elegirBomba(caudalLmin, setAgua)
  const ok = bomba.caudalMaxLmin >= caudalLmin && bomba.presionMaxBar >= setAgua - 1e-6
  const motivo = !aguaEnPlanta ? "no hay agua en planta: almacenar y presurizar" : `presión de agua insuficiente (${presionAgua} < ${setAgua} bar)`
  instalar.push({
    texto: `${estanque.modelo} + bomba ${bomba.modelo}`,
    detalle: `${motivo} a ${setAgua} bar · bomba ${bomba.hp} HP hasta ${bomba.caudalMaxLmin} L/min y ${bomba.presionMaxBar} bar · ${estanque.medidas}`,
  })
  if (!ok) advertencias.push(`La bomba ${bomba.modelo} (${bomba.caudalMaxLmin} L/min · ${bomba.presionMaxBar} bar) queda corta para ${caudalLmin.toFixed(1)} L/min a ${setAgua} bar. Elige otra bomba del catálogo.`)
  return bomba
}

// ── Regulador de agua con regla RBM Rinox (ratio entrada/salida <= 2,5). ──
function reguladorAgua(presionDisp: number, set: number, instalar: ItemReco[]) {
  if (presionDisp <= set + 0.05) return
  const ratio = presionDisp / set
  if (ratio > RBM_RATIO_MAX) {
    instalar.push({ texto: `2x ${COMPONENTES.regulador} en serie`, detalle: `relación ${presionDisp}/${set} = ${ratio.toFixed(1)} > 2,5: se reparte en dos reductores para evitar cavitación` })
  } else {
    instalar.push({ texto: COMPONENTES.regulador, detalle: `ajustar a ${set} bar (disponible ${presionDisp} bar)` })
  }
}

// ── Energía, controlador e instrumentación (común a ambos sistemas). ──
function energiaYControl(energiaEnPlanta: boolean, cargaKw: number, hayBomba: boolean, instalar: ItemReco[], noInstalar: ItemReco[]) {
  if (!energiaEnPlanta) {
    instalar.push({ texto: COMPONENTES.generador, detalle: `no hay energía en planta: alimenta bombas/compresor y control (carga estimada ~${cargaKw.toFixed(1)} kW)` })
  } else {
    noInstalar.push({ texto: "Generador", detalle: "hay energía eléctrica en planta" })
  }
  instalar.push({ texto: COMPONENTES.controlador, detalle: "comanda las electroválvulas y reporta estado (RS232)" })
  instalar.push({ texto: COMPONENTES.sensorPresion, detalle: "monitorea la presión de línea" })
  if (hayBomba) instalar.push({ texto: COMPONENTES.interruptorNivel, detalle: "protege la bomba de operar en vacío (nivel de estanque)" })
}

interface Ctx { aireEnPlanta: boolean; aguaEnPlanta: boolean; energiaEnPlanta: boolean; estanque: Estanque; bombaForzada: Bomba | null }

export function recomendar(e: EntradaInstalacion): Recomendacion {
  const sistema: SistemaBoquilla = e.sistema === "mhky" ? "mhky" : "turbofog"
  const ctx: Ctx = {
    aireEnPlanta: e.aireEnPlanta !== false,
    aguaEnPlanta: e.aguaEnPlanta !== false,
    energiaEnPlanta: e.energiaEnPlanta !== false,
    estanque: estanquePorLitros(e.estanqueLitros ?? 1100),
    bombaForzada: bombaPorModelo(e.bombaModelo),
  }
  return sistema === "mhky" ? recomendarMHKY(e, ctx) : recomendarTurbofog(e, ctx)
}

// ══ Sistema Turbofog (aire-agua) ═══════════════════════════════════════════════
function recomendarTurbofog(e: EntradaInstalacion, ctx: Ctx): Recomendacion {
  const { aireEnPlanta, aguaEnPlanta, energiaEnPlanta, estanque, bombaForzada } = ctx
  const advertencias: string[] = []
  const instalar: ItemReco[] = []
  const noInstalar: ItemReco[] = []

  const n = Math.max(0, Math.floor(e.nBoquillas || 0))
  const nSugerido = (e.largoCorrea && e.espaciamiento && e.espaciamiento > 0)
    ? Math.max(1, Math.ceil(e.largoCorrea / e.espaciamiento)) : null

  const tipo: "0.8" | "1" = e.boquillaTipo === "1" ? "1" : "0.8"
  const effAire = aireEnPlanta ? e.presionAire : 2.5
  const effAgua = aguaEnPlanta ? e.presionAgua : 6
  const fila = mejorFila(tipo, effAire, effAgua, e.objetivo)
  const boquillaModelo = `Turbofog Ø${tipo}mm`

  if (!fila) {
    const otra = tipo === "0.8" ? "1" : "0.8"
    if (mejorFila(otra as "0.8" | "1", effAire, effAgua, e.objetivo)) {
      advertencias.push(`Con la boquilla Ø${tipo}mm las presiones disponibles no alcanzan una posición de trabajo válida; la boquilla Ø${otra}mm sí funcionaría.`)
    }
    const minAgua = Math.min(...tabla(tipo).map(f => f.pAgua))
    const minAire = Math.min(...tabla(tipo).map(f => f.pAire))
    if (e.presionAgua < minAgua) advertencias.push(`Presión de agua insuficiente: se necesitan al menos ${minAgua} bar en la boquilla (disponible ${e.presionAgua} bar).`)
    if (e.presionAire < minAire) advertencias.push(`Presión de aire insuficiente: se necesitan al menos ${minAire} bar en la boquilla (disponible ${e.presionAire} bar).`)
    return {
      ok: false, boquillaElegida: tipo, fila: null,
      aguaTotalLmin: 0, aireTotalM3h: 0, aporteFrioTotal: 0,
      nSugerido, setAgua: null, setAire: null, evAgua: null, evAire: null,
      instalar, noInstalar, advertencias,
      aireEnPlanta, aguaEnPlanta, energiaEnPlanta, sistema: "turbofog",
      boquillaModelo, estanque, bomba: null,
    }
  }

  const aguaTotalLmin = +(n * fila.aguaLh / 60).toFixed(2)
  const aireTotalM3h = +(n * fila.aireM3h).toFixed(2)
  const aireTotalLmin = aireTotalM3h * 1000 / 60
  const aporteFrioTotal = Math.round(n * fila.aguaLh * 539)

  instalar.push({ texto: `${n} boquilla(s) Turbofog Ø${tipo}mm con válvula antigoteo`, detalle: `consumo total ${aguaTotalLmin} L/min de agua y ${aireTotalM3h} m³/h de aire` })

  if (aguaEnPlanta) reguladorAgua(e.presionAgua, fila.pAgua, instalar)

  if (!aireEnPlanta) {
    instalar.push({ texto: COMPONENTES.compresor, detalle: `no hay aire en planta: entrega ${COMPONENTES.compresorPresion} y ~${aireTotalM3h} m³/h (ajustar a ${fila.pAire} bar)` })
  } else if (e.presionAire > fila.pAire + 0.05) {
    instalar.push({ texto: `${COMPONENTES.regulador.replace("RBM Rinox", "de aire")} `.trim(), detalle: `ajustar a ${fila.pAire} bar (disponible ${e.presionAire} bar)` })
  }

  instalar.push({ texto: COMPONENTES.filtroAire, detalle: "protege boquillas y válvula en la línea de aire" })
  instalar.push({ texto: COMPONENTES.filtroAgua, detalle: "la válvula solenoide trae además filtro interno de 20 µm" })

  const evAgua = elegirEV(aguaTotalLmin)
  const evAire = elegirEV(aireTotalLmin)
  instalar.push(valvulaPara("agua", aguaTotalLmin, evAgua))
  instalar.push(valvulaPara("aire", aireTotalLmin, evAire))

  instalar.push({ texto: `Manifold de mezcla aire/agua con ${Math.max(1, n)} salida(s)` })

  const bomba = fuenteAgua({ aguaEnPlanta, presionAgua: e.presionAgua, setAgua: fila.pAgua, estanque, bombaForzada, caudalLmin: aguaTotalLmin }, instalar, noInstalar, advertencias)
  if (aireEnPlanta && e.presionAire >= fila.pAire) {
    noInstalar.push({ texto: "Compresor", detalle: `hay aire en planta suficiente (${e.presionAire} bar >= ${fila.pAire} bar de trabajo)` })
  }

  const cargaKw = (bomba?.kw ?? 0) + (!aireEnPlanta ? 7.5 : 0)
  energiaYControl(energiaEnPlanta, cargaKw, bomba != null, instalar, noInstalar)

  return {
    ok: true, boquillaElegida: tipo, fila,
    aguaTotalLmin, aireTotalM3h, aporteFrioTotal,
    nSugerido, setAgua: fila.pAgua, setAire: fila.pAire, evAgua, evAire,
    instalar, noInstalar, advertencias,
    aireEnPlanta, aguaEnPlanta, energiaEnPlanta, sistema: "turbofog",
    boquillaModelo, estanque, bomba,
  }
}

// ══ Sistema MHKY (solo-agua) ══════════════════════════════════════════════════
function mhkyAuto(obj: Objetivo): FilaMHKY {
  const code = obj === "fina" ? "6503" : obj === "ahorro" ? "6505" : "6515"
  return MHKY.find(m => m.codigo === code) ?? MHKY.find(m => m.codigo === "6510")!
}

function recomendarMHKY(e: EntradaInstalacion, ctx: Ctx): Recomendacion {
  const { aguaEnPlanta, energiaEnPlanta, estanque, bombaForzada } = ctx
  const advertencias: string[] = []
  const instalar: ItemReco[] = []
  const noInstalar: ItemReco[] = []

  const n = Math.max(0, Math.floor(e.nBoquillas || 0))
  const nSugerido = (e.largoCorrea && e.espaciamiento && e.espaciamiento > 0)
    ? Math.max(1, Math.ceil(e.largoCorrea / e.espaciamiento)) : null

  const fila = (e.mhkyCodigo && MHKY.find(m => m.codigo === e.mhkyCodigo)) || mhkyAuto(e.objetivo)
  const boquillaModelo = `MHKY ${fila.codigo} (cono 65°)`
  // Presión de trabajo: la disponible si hay agua; si no, la bomba la fija en 4 bar.
  const setAgua = aguaEnPlanta ? Math.max(1, e.presionAgua) : 4
  const perNozzle = mhkyCaudal(fila, setAgua)
  const aguaTotalLmin = +(n * perNozzle).toFixed(2)
  const aguaLh = perNozzle * 60
  const aporteFrioTotal = Math.round(n * aguaLh * 539)

  if (aguaEnPlanta && e.presionAgua < 1) {
    advertencias.push(`Presión de agua insuficiente para MHKY: se necesita al menos 1 bar (disponible ${e.presionAgua} bar). Requiere bomba.`)
  }

  instalar.push({ texto: `${n} boquilla(s) MHKY ${fila.codigo} (cono 65°, solo agua)`, detalle: `${perNozzle} L/min c/u a ${setAgua} bar · paso libre ${fila.pasoMm} mm · total ${aguaTotalLmin} L/min` })
  instalar.push({ texto: COMPONENTES.filtroAgua, detalle: "protege las boquillas MHKY (paso libre pequeño)" })

  const evAgua = elegirEV(aguaTotalLmin)
  instalar.push(valvulaPara("agua", aguaTotalLmin, evAgua))
  instalar.push({ texto: `Manifold de agua con ${Math.max(1, n)} salida(s)` })

  const bomba = fuenteAgua({ aguaEnPlanta, presionAgua: e.presionAgua, setAgua, estanque, bombaForzada, caudalLmin: aguaTotalLmin }, instalar, noInstalar, advertencias)
  noInstalar.push({ texto: "Línea de aire / compresor", detalle: "el sistema MHKY es solo agua (no usa aire comprimido)" })

  const cargaKw = bomba?.kw ?? 0
  energiaYControl(energiaEnPlanta, cargaKw, bomba != null, instalar, noInstalar)

  const ok = n > 0 && !(aguaEnPlanta && e.presionAgua < 1)
  return {
    ok, boquillaElegida: "0.8", fila: null,
    aguaTotalLmin, aireTotalM3h: 0, aporteFrioTotal,
    nSugerido, setAgua, setAire: null, evAgua, evAire: null,
    instalar, noInstalar, advertencias,
    aireEnPlanta: false, aguaEnPlanta, energiaEnPlanta, sistema: "mhky",
    boquillaModelo, estanque, bomba,
  }
}
