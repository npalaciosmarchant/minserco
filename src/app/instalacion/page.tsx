"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { instalaciones, bodega, equipos } from "@/lib/store"
import { Instalacion, ItemBodega, Equipo } from "@/lib/types"
import { recomendar, EntradaInstalacion, BoquillaTipo, Objetivo, SistemaBoquilla, ESTANQUES, BOMBAS, MHKY, ItemReco } from "@/lib/instalacion-utils"
import { bosquejoSVG, STOCK_COLOR, STOCK_LABEL } from "@/lib/bosquejo"
import { construirCtxBosquejo, buscarComponente, normalizarCajaTag } from "@/lib/instalacion-bodega"
import { imprimirInstalacionPDF } from "@/lib/instalacion-pdf"
import { fotoSrc } from "@/lib/upload-foto"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Droplets, Plus, Printer, Save, Trash2, Pencil, AlertTriangle, CheckCircle2, XCircle, Wand2, X, Package, Wrench } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

function cssEscapeTag(tag: string): string {
  if (typeof window !== "undefined" && window.CSS?.escape) return window.CSS.escape(tag)
  return tag.replace(/[^a-zA-Z0-9_-]/g, "\\$&")
}

interface FormState {
  cliente: string; faena: string; puntoDescarga: string
  presionAire: string; presionAgua: string; nBoquillas: string
  boquillaTipo: BoquillaTipo; objetivo: Objetivo
  sistema: SistemaBoquilla; mhkyCodigo: string
  aireEnPlanta: "si" | "no"; aguaEnPlanta: "si" | "no"; energiaEnPlanta: "si" | "no"
  estanqueLitros: string; bombaModelo: string
  largoCorrea: string; espaciamiento: string; observaciones: string
}

function emptyForm(): FormState {
  return {
    cliente: "", faena: "", puntoDescarga: "",
    presionAire: "6", presionAgua: "4", nBoquillas: "3",
    boquillaTipo: "auto", objetivo: "alcance",
    sistema: "turbofog", mhkyCodigo: "auto",
    aireEnPlanta: "si", aguaEnPlanta: "si", energiaEnPlanta: "si",
    estanqueLitros: "1100", bombaModelo: "auto",
    largoCorrea: "", espaciamiento: "", observaciones: "",
  }
}

const selCls = "w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"

export default function InstalacionPage() {
  const [lista, setLista] = useState<Instalacion[]>(() => instalaciones.getAll().slice().reverse())
  const [editando, setEditando] = useState<Instalacion | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [bodegaItems] = useState<ItemBodega[]>(() => bodega.getAll())
  const [equiposItems] = useState<Equipo[]>(() => equipos.getAll())
  const [hoverTag, setHoverTag] = useState<string | null>(null)
  const [detalleTag, setDetalleTag] = useState<string | null>(null)
  const diagramRef = useRef<HTMLDivElement>(null)

  const cargar = () => setLista(instalaciones.getAll().slice().reverse())
  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }) as FormState)

  const entrada: EntradaInstalacion = useMemo(() => ({
    presionAire: Number(form.presionAire) || 0,
    presionAgua: Number(form.presionAgua) || 0,
    nBoquillas: Number(form.nBoquillas) || 0,
    boquillaTipo: form.boquillaTipo,
    objetivo: form.objetivo,
    sistema: form.sistema,
    mhkyCodigo: form.mhkyCodigo === "auto" ? undefined : form.mhkyCodigo,
    aireEnPlanta: form.aireEnPlanta === "si",
    aguaEnPlanta: form.aguaEnPlanta === "si",
    energiaEnPlanta: form.energiaEnPlanta === "si",
    estanqueLitros: Number(form.estanqueLitros) || 1100,
    bombaModelo: form.bombaModelo,
    largoCorrea: form.largoCorrea ? Number(form.largoCorrea) : undefined,
    espaciamiento: form.espaciamiento ? Number(form.espaciamiento) : undefined,
  }), [form])

  const reco = useMemo(() => recomendar(entrada), [entrada])
  const ctxBosquejo = useMemo(
    () => construirCtxBosquejo(bodegaItems, equiposItems, typeof window !== "undefined" ? window.location.origin : ""),
    [bodegaItems, equiposItems],
  )
  const svg = useMemo(() => bosquejoSVG(entrada, reco, ctxBosquejo), [entrada, reco, ctxBosquejo])

  // Interactividad del bosquejo: click abre una ficha de detalle, hover resalta
  // la caja del dibujo y el ítem correspondiente en las listas (y viceversa).
  useEffect(() => {
    const root = diagramRef.current
    if (!root) return
    function tagDe(ev: Event): string | null {
      const target = ev.target as HTMLElement | null
      const el = target?.closest?.("[data-tag]") as HTMLElement | null
      return el?.getAttribute("data-tag") ?? null
    }
    function onOver(ev: Event) { const t = tagDe(ev); setHoverTag(t ? normalizarCajaTag(t) : null) }
    function onOut() { setHoverTag(null) }
    function onClick(ev: Event) {
      const tag = tagDe(ev)
      if (!tag) return
      ev.preventDefault()
      setDetalleTag(tag)
    }
    root.addEventListener("mouseover", onOver)
    root.addEventListener("mouseout", onOut)
    root.addEventListener("click", onClick)
    return () => {
      root.removeEventListener("mouseover", onOver)
      root.removeEventListener("mouseout", onOut)
      root.removeEventListener("click", onClick)
    }
  }, [svg])

  // Sincroniza el resaltado visual de la caja del bosquejo con hoverTag
  // (venga del propio dibujo o de pasar el mouse por una fila de las listas).
  useEffect(() => {
    const root = diagramRef.current
    if (!root) return
    root.querySelectorAll(".ins-hover").forEach(el => el.classList.remove("ins-hover"))
    if (hoverTag) {
      root.querySelectorAll(`[data-tag="${cssEscapeTag(hoverTag)}"]`).forEach(el => el.classList.add("ins-hover"))
    }
  }, [hoverTag, svg])

  const detalleKey = detalleTag ? normalizarCajaTag(detalleTag) : null
  const detalleItems: ItemReco[] = useMemo(
    () => detalleKey ? [...reco.instalar, ...reco.noInstalar].filter(it => it.cajaTags?.includes(detalleKey)) : [],
    [detalleKey, reco],
  )
  const detalleMatch = useMemo(
    () => detalleKey ? buscarComponente(detalleKey, bodegaItems, equiposItems) : null,
    [detalleKey, bodegaItems, equiposItems],
  )

  function nuevo() { setEditando(null); setForm(emptyForm()) }

  function guardar() {
    const payload = {
      cliente: form.cliente, faena: form.faena, puntoDescarga: form.puntoDescarga,
      presionAire: entrada.presionAire, presionAgua: entrada.presionAgua,
      nBoquillas: entrada.nBoquillas, boquillaTipo: form.boquillaTipo,
      largoCorrea: entrada.largoCorrea, espaciamiento: entrada.espaciamiento,
      resultado: reco as unknown, observaciones: form.observaciones,
    }
    if (editando) instalaciones.update(editando.id, payload)
    else instalaciones.add(payload)
    cargar(); nuevo()
  }

  function abrir(i: Instalacion) {
    setEditando(i)
    setForm({
      cliente: i.cliente ?? "", faena: i.faena ?? "", puntoDescarga: i.puntoDescarga ?? "",
      presionAire: String(i.presionAire ?? ""), presionAgua: String(i.presionAgua ?? ""),
      nBoquillas: String(i.nBoquillas ?? ""),
      boquillaTipo: (i.boquillaTipo as BoquillaTipo) ?? "auto", objetivo: "alcance",
      aireEnPlanta: (i.resultado as { aireEnPlanta?: boolean } | undefined)?.aireEnPlanta === false ? "no" : "si",
      aguaEnPlanta: (i.resultado as { aguaEnPlanta?: boolean } | undefined)?.aguaEnPlanta === false ? "no" : "si",
      energiaEnPlanta: (i.resultado as { energiaEnPlanta?: boolean } | undefined)?.energiaEnPlanta === false ? "no" : "si",
      sistema: (i.resultado as { sistema?: string } | undefined)?.sistema === "mhky" ? "mhky" : "turbofog",
      mhkyCodigo: "auto",
      estanqueLitros: (i.resultado as { estanque?: { litros?: number } } | undefined)?.estanque?.litros != null ? String((i.resultado as { estanque?: { litros?: number } }).estanque!.litros) : "1100",
      bombaModelo: "auto",
      largoCorrea: i.largoCorrea != null ? String(i.largoCorrea) : "",
      espaciamiento: i.espaciamiento != null ? String(i.espaciamiento) : "",
      observaciones: i.observaciones ?? "",
    })
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este registro de instalación?")) return
    instalaciones.delete(id); cargar()
    if (editando?.id === id) nuevo()
  }

  function pdf() { imprimirInstalacionPDF(entrada, reco, { cliente: form.cliente, faena: form.faena, puntoDescarga: form.puntoDescarga }) }

  const stats = [
    { label: "Registros", value: lista.length },
    { label: "Caudal agua", value: `${reco.aguaTotalLmin} L/min`, color: "#2563eb" },
    { label: "Consumo aire", value: `${reco.aireTotalM3h} m³/h`, color: "#0ea5e9" },
  ]

  return (
    <PageShell icon={Droplets} title="Instalación de Nebulización" subtitle="Cálculo de supresión de polvo aire-agua y bosquejo de montaje" color="#0ea5e9" stats={stats}
      actions={<button className="btn-accent" onClick={nuevo}><Plus size={14} /> Nuevo cálculo</button>}>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* Formulario */}
        <div className="glass-section p-4 space-y-3 self-start">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Datos en terreno</div>
          <div className="space-y-1"><Label>Sistema de boquilla</Label>
            <select className={selCls} value={form.sistema} onChange={e => set("sistema", e.target.value)}>
              <option value="turbofog">Turbofog (aire + agua)</option>
              <option value="mhky">MHKY (solo agua)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>¿Aire en planta?</Label>
              <select className={selCls} value={form.aireEnPlanta} disabled={form.sistema === "mhky"} onChange={e => set("aireEnPlanta", e.target.value)}>
                <option value="si">Sí</option>
                <option value="no">No (agregar compresor)</option>
              </select>
            </div>
            <div className="space-y-1"><Label>¿Agua en planta?</Label>
              <select className={selCls} value={form.aguaEnPlanta} onChange={e => set("aguaEnPlanta", e.target.value)}>
                <option value="si">Sí</option>
                <option value="no">No (agregar estanque)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>¿Energía en planta?</Label>
              <select className={selCls} value={form.energiaEnPlanta} onChange={e => set("energiaEnPlanta", e.target.value)}>
                <option value="si">Sí</option>
                <option value="no">No (agregar generador)</option>
              </select>
            </div>
{form.aguaEnPlanta === "no" ? (
              <div className="space-y-1"><Label>Estanque</Label>
                <select className={selCls} value={form.estanqueLitros} onChange={e => set("estanqueLitros", e.target.value)}>
                  {ESTANQUES.map(t => <option key={t.litros} value={t.litros}>{t.litros.toLocaleString("es-CL")} L</option>)}
                </select>
              </div>
            ) : <div />}
          </div>
          <div className="space-y-1"><Label>Bomba</Label>
            <select className={selCls} value={form.bombaModelo} onChange={e => set("bombaModelo", e.target.value)}>
              <option value="auto">Automática (según caudal/presión)</option>
              {BOMBAS.map(b => <option key={b.modelo} value={b.modelo}>{b.modelo}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Presión aire (bar)</Label><Input type="number" step="0.1" min="0" value={form.presionAire} disabled={form.aireEnPlanta === "no" || form.sistema === "mhky"} onChange={e => set("presionAire", e.target.value)} /></div>
            <div className="space-y-1"><Label>Presión agua (bar)</Label><Input type="number" step="0.1" min="0" value={form.presionAgua} disabled={form.aguaEnPlanta === "no"} onChange={e => set("presionAgua", e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>N° de boquillas</Label><Input type="number" min="1" value={form.nBoquillas} onChange={e => set("nBoquillas", e.target.value)} /></div>

          {reco.nSugerido != null && (
            <button type="button" onClick={() => set("nBoquillas", String(reco.nSugerido))}
              className="w-full flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg" style={{ background: "#eff6ff", color: "#1d4ed8" }}>
              <Wand2 size={12} /> Sugerido: {reco.nSugerido} boquillas (largo / espaciamiento) — aplicar
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Boquilla</Label>
              {form.sistema === "mhky" ? (
                <select className={selCls} value={form.mhkyCodigo} onChange={e => set("mhkyCodigo", e.target.value)}>
                  <option value="auto">Automática (según prioridad)</option>
                  {MHKY.map(m => <option key={m.codigo} value={m.codigo}>MHKY {m.codigo}</option>)}
                </select>
              ) : (
                <select className={selCls} value={form.boquillaTipo} onChange={e => set("boquillaTipo", e.target.value)}>
                  <option value="auto">Automática</option>
                  <option value="0.8">Ø 0,8 mm</option>
                  <option value="1">Ø 1 mm</option>
                </select>
              )}
            </div>
            <div className="space-y-1"><Label>Prioridad</Label>
              <select className={selCls} value={form.objetivo} onChange={e => set("objetivo", e.target.value)}>
                <option value="alcance">Mayor alcance</option>
                <option value="fina">Gota más fina</option>
                <option value="ahorro">Menor consumo de agua</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: "var(--muted-foreground)" }}>Sugerir N° (opcional)</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Largo correa (m)</Label><Input type="number" step="0.1" value={form.largoCorrea} onChange={e => set("largoCorrea", e.target.value)} /></div>
            <div className="space-y-1"><Label>Espaciamiento (m)</Label><Input type="number" step="0.1" value={form.espaciamiento} onChange={e => set("espaciamiento", e.target.value)} /></div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider pt-1" style={{ color: "var(--muted-foreground)" }}>Identificación</div>
          <div className="space-y-1"><Label>Cliente / faena</Label><Input value={form.cliente} onChange={e => set("cliente", e.target.value)} placeholder="Ej: Minera X" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Faena / área</Label><Input value={form.faena} onChange={e => set("faena", e.target.value)} /></div>
            <div className="space-y-1"><Label>Punto de descarga</Label><Input value={form.puntoDescarga} onChange={e => set("puntoDescarga", e.target.value)} placeholder="Ej: Correa CV-102" /></div>
          </div>
          <div className="space-y-1"><Label>Observaciones</Label><Textarea rows={2} value={form.observaciones} onChange={e => set("observaciones", e.target.value)} /></div>

          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={guardar}><Save size={14} className="mr-1" />{editando ? "Guardar cambios" : "Guardar registro"}</Button>
            <Button variant="outline" onClick={pdf} title="Descargar informe PDF"><Printer size={14} /></Button>
          </div>
        </div>

        {/* Resultado */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {reco.ok ? (
              <>
                <Chip l="Boquilla elegida" v={reco.boquillaModelo} />
                {reco.fila
                  ? <Chip l="Punto de trabajo" v={`aire ${reco.fila.pAire} · agua ${reco.fila.pAgua} bar`} />
                  : <Chip l="Presión de trabajo" v={`agua ${reco.setAgua} bar`} />}
                {reco.fila && <Chip l="Alcance de nube" v={`${reco.fila.alcanceM} m`} />}
                {reco.fila && <Chip l="Tamaño de gota" v={`${reco.fila.gotaUm} µm`} />}
                <Chip l="Caudal agua total" v={`${reco.aguaTotalLmin} L/min`} />
                {reco.aireTotalM3h > 0 && <Chip l="Consumo aire total" v={`${reco.aireTotalM3h} m³/h`} />}
                <Chip l="Aporte de frío" v={`${reco.aporteFrioTotal.toLocaleString("es-CL")} frig./h`} />
                {reco.bomba && <Chip l="Bomba" v={reco.bomba.modelo} />}
                {!reco.aguaEnPlanta && <Chip l="Estanque" v={`${reco.estanque.litros.toLocaleString("es-CL")} L`} />}
              </>
            ) : (
              <div className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: "#fef2f2", color: "#b91c1c" }}>
                <AlertTriangle size={15} /> No hay un punto de trabajo válido con las presiones ingresadas. Revisa las advertencias abajo.
              </div>
            )}
          </div>

          <div className="glass-section p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Bosquejo de instalación</div>
              <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Pasa el mouse o haz clic en una caja para ver el detalle</div>
            </div>
            <div ref={diagramRef} dangerouslySetInnerHTML={{ __html: svg }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div className="flex items-center gap-1.5 text-sm font-bold mb-2" style={{ color: "#059669" }}><CheckCircle2 size={15} /> SE DEBE INSTALAR</div>
              <ul className="space-y-2">
                {reco.instalar.map((it, i) => {
                  const tag = it.cajaTags?.[0]
                  const activo = !!tag && hoverTag === tag
                  return (
                    <li key={i} className="text-xs rounded-md -mx-1.5 px-1.5 py-0.5 transition-colors" style={{ color: "#065f46", background: activo ? "#bbf7d0" : "transparent", cursor: tag ? "pointer" : "default" }}
                      onMouseEnter={() => tag && setHoverTag(tag)} onMouseLeave={() => setHoverTag(null)}
                      onClick={() => tag && setDetalleTag(tag)}>
                      <span className="font-semibold">✓ {it.texto}</span>
                      {it.detalle && <span className="block ml-4" style={{ color: "#16a34a" }}>{it.detalle}</span>}
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <div className="flex items-center gap-1.5 text-sm font-bold mb-2" style={{ color: "#dc2626" }}><XCircle size={15} /> NO SE INSTALA</div>
              <ul className="space-y-2">
                {reco.noInstalar.length === 0 && <li className="text-xs" style={{ color: "#9ca3af" }}>—</li>}
                {reco.noInstalar.map((it, i) => (
                  <li key={i} className="text-xs" style={{ color: "#991b1b" }}>
                    <span className="font-semibold">✗ {it.texto}</span>
                    {it.detalle && <span className="block ml-4" style={{ color: "#dc2626" }}>{it.detalle}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {reco.advertencias.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
              <div className="text-sm font-bold mb-1" style={{ color: "#b45309" }}>Advertencias</div>
              <ul className="space-y-1">
                {reco.advertencias.map((a, i) => <li key={i} className="text-xs" style={{ color: "#92400e" }}>• {a}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--muted-foreground)" }}>Instalaciones guardadas ({lista.length})</div>
        {lista.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Aún no hay cálculos guardados.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {lista.map(i => (
              <div key={i.id} className="glass-card p-4 group">
                <div className="flex items-start justify-between mb-1">
                  <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{i.cliente || "Sin cliente"}</div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Cargar" onClick={() => abrir(i)}><Pencil size={13} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(i.id)}><Trash2 size={13} /></Button>
                  </div>
                </div>
                <div className="text-xs space-y-0.5" style={{ color: "var(--muted-foreground)" }}>
                  {i.faena && <div>{i.faena}{i.puntoDescarga ? ` · ${i.puntoDescarga}` : ""}</div>}
                  <div>Aire {i.presionAire} bar · Agua {i.presionAgua} bar · {i.nBoquillas} boq. Ø{i.boquillaTipo}mm</div>
                  <div>{new Date(i.creadoEn).toLocaleDateString("es-CL")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detalleTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,.55)" }} onClick={() => setDetalleTag(null)}>
          <div className="glass-section max-w-md w-full p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Componente {detalleTag}</div>
              <button onClick={() => setDetalleTag(null)} className="opacity-70 hover:opacity-100"><X size={16} /></button>
            </div>

            {detalleItems.length === 0 ? (
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Sin detalle adicional para este componente.</div>
            ) : (
              <div className="space-y-2 mb-3">
                {detalleItems.map((it, i) => (
                  <div key={i}>
                    <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{it.texto}</div>
                    {it.detalle && <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{it.detalle}</div>}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 mt-1 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                <Package size={12} /> Bodega
              </div>
              {detalleMatch?.bodega ? (
                <div className="flex gap-3">
                  {detalleMatch.bodega.item.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fotoSrc(detalleMatch.bodega.item.foto)} alt={detalleMatch.bodega.item.nombre} className="w-16 h-16 rounded-lg object-cover border shrink-0" style={{ borderColor: "var(--border)" }} />
                  ) : null}
                  <div className="text-xs space-y-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: "var(--foreground)" }}>{detalleMatch.bodega.item.nombre}</div>
                    <div style={{ color: "var(--muted-foreground)" }}>
                      Código {detalleMatch.bodega.item.codigo} · {detalleMatch.bodega.item.cantidad} {detalleMatch.bodega.item.unidad} en {detalleMatch.bodega.item.ubicacion || "bodega"}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: STOCK_COLOR[detalleMatch.bodega.estado] + "22", color: STOCK_COLOR[detalleMatch.bodega.estado] }}>
                      ● {STOCK_LABEL[detalleMatch.bodega.estado]}
                    </span>
                    <a href={`/bodega?buscar=${encodeURIComponent(detalleMatch.bodega.item.codigo || detalleMatch.bodega.item.nombre)}`} target="_blank" rel="noopener noreferrer" className="block underline text-[11px]" style={{ color: "#1d4ed8" }}>
                      Ver en bodega →
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  No se encontró un ítem coincidente en bodega.
                </div>
              )}
            </div>

            {detalleMatch?.equipo && (
              <div className="pt-3 mt-3 border-t" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                  <Wrench size={12} /> Equipos
                </div>
                <div className="flex gap-3">
                  {detalleMatch.equipo.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fotoSrc(detalleMatch.equipo.foto)} alt={detalleMatch.equipo.nombre} className="w-16 h-16 rounded-lg object-cover border shrink-0" style={{ borderColor: "var(--border)" }} />
                  ) : null}
                  <div className="text-xs space-y-1 min-w-0">
                    <div className="font-semibold truncate" style={{ color: "var(--foreground)" }}>{detalleMatch.equipo.nombre}</div>
                    <div style={{ color: "var(--muted-foreground)" }}>
                      {[detalleMatch.equipo.marca, detalleMatch.equipo.modelo].filter(Boolean).join(" ") || "—"}
                      {detalleMatch.equipo.numeroSerie ? ` · SN ${detalleMatch.equipo.numeroSerie}` : ""}
                    </div>
                    {detalleMatch.equipo.fichasTecnicas && detalleMatch.equipo.fichasTecnicas.length > 0 && (
                      <div className="flex flex-col gap-0.5">
                        {detalleMatch.equipo.fichasTecnicas.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "#1d4ed8" }}>
                            📄 {f.nombre || "Ficha técnica"}
                          </a>
                        ))}
                      </div>
                    )}
                    <a href={`/equipos?id=${encodeURIComponent(detalleMatch.equipo.id)}`} target="_blank" rel="noopener noreferrer" className="block underline text-[11px]" style={{ color: "#1d4ed8" }}>
                      Ver en equipos →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {!detalleMatch?.bodega && !detalleMatch?.equipo && (
              <div className="text-[11px] mt-2" style={{ color: "var(--muted-foreground)" }}>
                Ficha técnica y foto no disponibles aún.
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}

function Chip({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
      <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{l}</div>
      <div className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{v}</div>
    </div>
  )
}
