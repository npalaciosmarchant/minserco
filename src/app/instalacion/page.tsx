"use client"

import { useMemo, useState } from "react"
import { instalaciones } from "@/lib/store"
import { Instalacion } from "@/lib/types"
import { recomendar, EntradaInstalacion, BoquillaTipo, Objetivo } from "@/lib/instalacion-utils"
import { bosquejoSVG } from "@/lib/bosquejo"
import { imprimirInstalacionPDF } from "@/lib/instalacion-pdf"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Droplets, Plus, Printer, Save, Trash2, Pencil, AlertTriangle, CheckCircle2, XCircle, Wand2 } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

interface FormState {
  cliente: string; faena: string; puntoDescarga: string
  presionAire: string; presionAgua: string; nBoquillas: string
  boquillaTipo: BoquillaTipo; objetivo: Objetivo
  largoCorrea: string; espaciamiento: string; observaciones: string
}

function emptyForm(): FormState {
  return {
    cliente: "", faena: "", puntoDescarga: "",
    presionAire: "6", presionAgua: "4", nBoquillas: "3",
    boquillaTipo: "auto", objetivo: "alcance",
    largoCorrea: "", espaciamiento: "", observaciones: "",
  }
}

const selCls = "w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"

export default function InstalacionPage() {
  const [lista, setLista] = useState<Instalacion[]>(() => instalaciones.getAll().slice().reverse())
  const [editando, setEditando] = useState<Instalacion | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const cargar = () => setLista(instalaciones.getAll().slice().reverse())
  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }) as FormState)

  const entrada: EntradaInstalacion = useMemo(() => ({
    presionAire: Number(form.presionAire) || 0,
    presionAgua: Number(form.presionAgua) || 0,
    nBoquillas: Number(form.nBoquillas) || 0,
    boquillaTipo: form.boquillaTipo,
    objetivo: form.objetivo,
    largoCorrea: form.largoCorrea ? Number(form.largoCorrea) : undefined,
    espaciamiento: form.espaciamiento ? Number(form.espaciamiento) : undefined,
  }), [form])

  const reco = useMemo(() => recomendar(entrada), [entrada])
  const svg = useMemo(() => bosquejoSVG(entrada, reco), [entrada, reco])

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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Presión aire (bar)</Label><Input type="number" step="0.1" min="0" value={form.presionAire} onChange={e => set("presionAire", e.target.value)} /></div>
            <div className="space-y-1"><Label>Presión agua (bar)</Label><Input type="number" step="0.1" min="0" value={form.presionAgua} onChange={e => set("presionAgua", e.target.value)} /></div>
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
              <select className={selCls} value={form.boquillaTipo} onChange={e => set("boquillaTipo", e.target.value)}>
                <option value="auto">Automática</option>
                <option value="0.8">Ø 0,8 mm</option>
                <option value="1">Ø 1 mm</option>
              </select>
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
            {reco.fila ? (
              <>
                <Chip l="Boquilla elegida" v={`Ø${reco.boquillaElegida}mm`} />
                <Chip l="Punto de trabajo" v={`aire ${reco.fila.pAire} · agua ${reco.fila.pAgua} bar`} />
                <Chip l="Alcance de nube" v={`${reco.fila.alcanceM} m`} />
                <Chip l="Tamaño de gota" v={`${reco.fila.gotaUm} µm`} />
                <Chip l="Caudal agua total" v={`${reco.aguaTotalLmin} L/min`} />
                <Chip l="Consumo aire total" v={`${reco.aireTotalM3h} m³/h`} />
                <Chip l="Aporte de frío" v={`${reco.aporteFrioTotal.toLocaleString("es-CL")} frig./h`} />
              </>
            ) : (
              <div className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: "#fef2f2", color: "#b91c1c" }}>
                <AlertTriangle size={15} /> No hay un punto de trabajo válido con las presiones ingresadas. Revisa las advertencias abajo.
              </div>
            )}
          </div>

          <div className="glass-section p-3">
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>Bosquejo de instalación</div>
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div className="flex items-center gap-1.5 text-sm font-bold mb-2" style={{ color: "#059669" }}><CheckCircle2 size={15} /> SE DEBE INSTALAR</div>
              <ul className="space-y-2">
                {reco.instalar.map((it, i) => (
                  <li key={i} className="text-xs" style={{ color: "#065f46" }}>
                    <span className="font-semibold">✓ {it.texto}</span>
                    {it.detalle && <span className="block ml-4" style={{ color: "#16a34a" }}>{it.detalle}</span>}
                  </li>
                ))}
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
