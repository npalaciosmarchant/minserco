"use client"

import { useEffect, useState, useRef } from "react"
import { gastos, tiposGasto } from "@/lib/store"
import { Gasto, CategoriaGasto, TipoGasto, EstadoGasto, TipoDocumentoGasto } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Pencil, Trash2, Receipt, CheckCircle2, Clock,
  XCircle, Send, Upload, Maximize2, FileImage, FileText, X, Download, Tag,
} from "lucide-react"
import { imprimirGastosPDF } from "@/lib/gastos-pdf"
import { subirArchivo } from "@/lib/upload-archivo"
import PageShell from "@/components/layout/PageShell"
import DateFilter, { filterByDate, DateRange } from "@/components/ui/DateFilter"
import Pagination from "@/components/ui/Pagination"
import { usePagination } from "@/lib/usePagination"

const categoriaCfg: Record<CategoriaGasto, { label: string; color: string; bg: string }> = {
  materiales:   { label: "Materiales",   color: "#2563eb", bg: "#eff6ff" },
  viaticos:     { label: "Viáticos",     color: "#7c3aed", bg: "#f5f3ff" },
  herramientas: { label: "Herramientas", color: "#d97706", bg: "#fffbeb" },
  servicios:    { label: "Servicios",    color: "#0891b2", bg: "#ecfeff" },
  combustible:  { label: "Combustible",  color: "#ea580c", bg: "#fff7ed" },
  alojamiento:  { label: "Alojamiento",  color: "#059669", bg: "#f0fdf4" },
  otro:         { label: "Otro",         color: "#64748b", bg: "#f8fafc" },
}

// Info visual de una categoría: usa la config fija de arriba si es una de las 7 base,
// o busca el tipo personalizado creado por el usuario; si no encuentra nada, usa un estilo neutro.
function catInfo(categoria: string, tipos: TipoGasto[]): { label: string; color: string; bg: string } {
  const fija = (categoriaCfg as Record<string, { label: string; color: string; bg: string }>)[categoria]
  if (fija) return fija
  const custom = tipos.find(t => t.nombre === categoria)
  if (custom) return { label: custom.nombre, color: "#6366f1", bg: "#eef2ff" }
  return { label: categoria || "Sin categoría", color: "#64748b", bg: "#f8fafc" }
}

const estadoCfg: Record<EstadoGasto, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  borrador:  { label: "Borrador",  color: "#64748b", bg: "#f8fafc",  Icon: Clock },
  enviado:   { label: "Enviado",   color: "#2563eb", bg: "#eff6ff",  Icon: Send },
  aprobado:  { label: "Aprobado",  color: "#059669", bg: "#f0fdf4",  Icon: CheckCircle2 },
  rechazado: { label: "Rechazado", color: "#dc2626", bg: "#fef2f2",  Icon: XCircle },
}

const tipoDocCfg: Record<TipoDocumentoGasto, { label: string; color: string }> = {
  boleta:  { label: "Boleta",  color: "#2563eb" },
  factura: { label: "Factura", color: "#7c3aed" },
  otro:    { label: "Otro",    color: "#64748b" },
}

function fmtCLP(n: number, moneda: string) {
  if (moneda === "USD") return `USD ${n.toLocaleString("es-CL")}`
  return `$${n.toLocaleString("es-CL")}`
}

function emptyForm(): Omit<Gasto, "id" | "creadoEn"> {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    categoria: "materiales",
    descripcion: "",
    monto: 0,
    moneda: "CLP",
    responsable: "",
    tipoDocumento: "boleta",
    numeroBoleta: "",
    faenaProyecto: "",
    adjuntoBase64: "",
    adjuntoUrl: "",
    adjuntoNombre: "",
    adjuntoTipo: "",
    estado: "borrador",
    observaciones: "",
  }
}

// Devuelve el origen del adjunto: enlace de Storage (nuevo) o data-URL base64 (antiguos)
function adjuntoSrc(g: { adjuntoUrl?: string; adjuntoBase64?: string; adjuntoTipo?: string }): string {
  if (g.adjuntoUrl) return g.adjuntoUrl
  if (g.adjuntoBase64) return `data:${g.adjuntoTipo ?? "application/octet-stream"};base64,${g.adjuntoBase64}`
  return ""
}
function tieneAdjunto(g: { adjuntoUrl?: string; adjuntoBase64?: string }): boolean {
  return !!(g.adjuntoUrl || g.adjuntoBase64)
}

// Visor de imagen/PDF maximizado
function AdjuntoViewer({ src, tipo, nombre, onClose }: {
  src: string; tipo: string; nombre: string; onClose: () => void
}) {
  const isPDF = tipo === "application/pdf"
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <div className="relative max-w-5xl max-h-[92vh] w-full mx-4 rounded-2xl overflow-hidden shadow-2xl bg-white"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
          <span className="text-sm font-medium truncate">{nombre}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>
        {isPDF
          ? <iframe src={src} className="w-full" style={{ height: "80vh" }} title={nombre} />
          : <img src={src} alt={nombre} className="w-full max-h-[80vh] object-contain bg-gray-50" />
        }
      </div>
    </div>
  )
}

export default function GastosPage() {
  const [lista, setLista] = useState<Gasto[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Gasto | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [filtroEstado, setFiltroEstado] = useState<EstadoGasto | "todos">("todos")
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos")
  const [visorAdjunto, setVisorAdjunto] = useState<Gasto | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" })

  const [tiposList, setTiposList] = useState<TipoGasto[]>([])
  const [openTipos, setOpenTipos] = useState(false)
  const [formTipo, setFormTipo] = useState({ nombre: "", descripcion: "" })

  const cargar = () => {
    setLista(gastos.getAll().slice().reverse())
    setTiposList(tiposGasto.getAll())
  }
  useEffect(() => { cargar() }, [])

  function agregarTipo() {
    const nom = formTipo.nombre.trim()
    if (!nom) return
    tiposGasto.add({ nombre: nom, descripcion: formTipo.descripcion.trim() || undefined })
    setFormTipo({ nombre: "", descripcion: "" }); cargar()
  }
  function renombrarTipo(t: TipoGasto) {
    const nom = prompt("Nuevo nombre del tipo de gasto:", t.nombre)
    if (nom && nom.trim()) { tiposGasto.update(t.id, { nombre: nom.trim() }); cargar() }
  }
  function eliminarTipo(id: string) {
    if (confirm("¿Eliminar este tipo de gasto? Los gastos ya registrados con este tipo no se modifican.")) {
      tiposGasto.delete(id); cargar()
    }
  }

  function abrir(g?: Gasto) {
    if (g) { setEditando(g); const { id, creadoEn, ...r } = g; setForm(r) }
    else { setEditando(null); setForm(emptyForm()) }
    setOpen(true)
  }

  function guardar() {
    if (!form.descripcion || !form.responsable || form.monto <= 0) return
    editando ? gastos.update(editando.id, form) : gastos.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar gasto?")) return
    gastos.delete(id); cargar()
  }

  const setS = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert("El archivo supera los 10MB. Usa uno más liviano."); return }
    setSubiendo(true)
    try {
      const { url } = await subirArchivo(file)
      setForm(f => ({
        ...f,
        adjuntoUrl: url,
        adjuntoNombre: file.name,
        adjuntoTipo: file.type,
        adjuntoBase64: "", // ya no se guarda el archivo en el registro
      }))
    } catch (err) {
      alert("No se pudo subir el archivo: " + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSubiendo(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function removeAdjunto() {
    setForm(f => ({ ...f, adjuntoBase64: "", adjuntoUrl: "", adjuntoNombre: "", adjuntoTipo: "" }))
    if (fileRef.current) fileRef.current.value = ""
  }

  const filtrada = lista.filter(g => {
    if (filtroEstado !== "todos" && g.estado !== filtroEstado) return false
    if (filtroCategoria !== "todos" && g.categoria !== filtroCategoria) return false
    return true
  })

  const filtradaFecha = filterByDate(filtrada, dateRange)
  const { paged, page, totalPages, goTo, reset, total } = usePagination(filtradaFecha, 20)

  const totalFiltrado = filtrada.reduce((s, g) => s + (g.moneda === "CLP" ? g.monto : g.monto * 900), 0)
  const pendientes = lista.filter(g => g.estado === "borrador" || g.estado === "enviado").length

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Pendientes", value: pendientes, color: "#d97706" },
    { label: "Aprobados", value: lista.filter(g => g.estado === "aprobado").length, color: "#059669" },
  ]

  return (
    <PageShell
      icon={Receipt}
      title="Rendición de Gastos"
      subtitle="Registro y aprobación de gastos operacionales"
      color="#2563eb"
      stats={stats}
      actions={
        <div className="flex gap-2">
          {filtradaFecha.length > 0 && (
            <button
              className="btn-secondary flex items-center gap-1.5"
              onClick={() => imprimirGastosPDF({
                gastos: filtradaFecha,
                titulo: "Rendición de Gastos",
                subtitulo: filtroEstado !== "todos" ? estadoCfg[filtroEstado as EstadoGasto]?.label : undefined,
                periodoLabel: dateRange.from || dateRange.to
                  ? [dateRange.from, dateRange.to].filter(Boolean).join(" → ")
                  : undefined,
              })}
            >
              <Download size={14} /> Exportar PDF
            </button>
          )}
          <button className="btn-ghost" onClick={() => setOpenTipos(true)}><Tag size={13} /> Tipos de Gasto</button>
          <button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Gasto</button>
        </div>
      }
    >
      {/* Visor maximizado */}
      {visorAdjunto && tieneAdjunto(visorAdjunto) && (
        <AdjuntoViewer
          src={adjuntoSrc(visorAdjunto)}
          tipo={visorAdjunto.adjuntoTipo ?? "image/png"}
          nombre={visorAdjunto.adjuntoNombre ?? "Adjunto"}
          onClose={() => setVisorAdjunto(null)}
        />
      )}

      {/* Filtros */}
      <div className="mb-3"><DateFilter onChange={r => { setDateRange(r); reset() }} /></div>
      <div className="flex flex-wrap gap-2 mb-5">
        <select className="h-8 px-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700"
          value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as EstadoGasto | "todos")}>
          <option value="todos">Todos los estados</option>
          {(Object.keys(estadoCfg) as EstadoGasto[]).map(e => (
            <option key={e} value={e}>{estadoCfg[e].label}</option>
          ))}
        </select>
        <select className="h-8 px-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-700"
          value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
          <option value="todos">Todas las categorías</option>
          {(Object.keys(categoriaCfg) as CategoriaGasto[]).map(c => (
            <option key={c} value={c}>{categoriaCfg[c].label}</option>
          ))}
          {tiposList.map(t => (
            <option key={t.id} value={t.nombre}>{t.nombre}</option>
          ))}
        </select>
        {filtrada.length > 0 && (
          <span className="ml-auto text-sm font-semibold text-gray-700 self-center">
            Total: {fmtCLP(totalFiltrado, "CLP")}
          </span>
        )}
      </div>

      {/* Lista */}
      <div className="glass-section overflow-hidden">
        {filtradaFecha.length === 0 ? (
          <div className="empty-state"><Receipt size={40} /><p>No hay gastos registrados</p></div>
        ) : (
          paged.map((g, i) => {
            const cat = catInfo(g.categoria, tiposList)
            const est = estadoCfg[g.estado]
            const EstIcon = est.Icon
            const tipoDoc = tipoDocCfg[g.tipoDocumento ?? "otro"]
            return (
              <div key={g.id} className="group flex items-start gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                style={{ borderBottom: i < paged.length - 1 ? "1px solid #f1f5f9" : "none" }}>

                {/* Adjunto thumbnail */}
                <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer relative"
                  style={{ background: cat.bg, border: `1px solid ${cat.color}30` }}
                  onClick={() => tieneAdjunto(g) ? setVisorAdjunto(g) : undefined}>
                  {tieneAdjunto(g) ? (
                    <>
                      {g.adjuntoTipo?.startsWith("image/")
                        ? <img src={adjuntoSrc(g)}
                            alt="" className="w-full h-full object-cover" />
                        : <FileText size={20} style={{ color: cat.color }} />
                      }
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Maximize2 size={14} className="text-white opacity-0 hover:opacity-100" />
                      </div>
                    </>
                  ) : (
                    <span className="text-lg font-bold" style={{ color: cat.color }}>
                      {cat.label.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-gray-900">{g.descripcion}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: cat.bg, color: cat.color }}>{cat.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "#f1f5f9", color: tipoDoc.color }}>{tipoDoc.label}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                      style={{ background: est.bg, color: est.color }}>
                      <EstIcon size={10} />{est.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-0.5">
                    <span>{g.fecha}</span>
                    <span>·</span>
                    <span>{g.responsable}</span>
                    {g.numeroBoleta && <><span>·</span><span>{tipoDoc.label} #{g.numeroBoleta}</span></>}
                  </div>
                  {g.faenaProyecto && (
                    <div className="text-xs text-gray-500 italic">
                      📍 {g.faenaProyecto}
                    </div>
                  )}
                  {tieneAdjunto(g) && (
                    <button onClick={() => setVisorAdjunto(g)}
                      className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      <FileImage size={11} />
                      {g.adjuntoNombre ?? "Ver adjunto"}
                      <Maximize2 size={10} />
                    </button>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-bold text-gray-900">{fmtCLP(g.monto, g.moneda)}</div>
                </div>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                  {g.estado === "borrador" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500" title="Marcar como enviado"
                      onClick={() => { gastos.update(g.id, { estado: "enviado" }); cargar() }}>
                      <Send size={12} />
                    </Button>
                  )}
                  {g.estado === "enviado" && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Aprobar"
                      onClick={() => { gastos.update(g.id, { estado: "aprobado" }); cargar() }}>
                      <CheckCircle2 size={12} />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(g)}>
                    <Pencil size={12} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(g.id)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPage={goTo} />

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Gasto" : "Nuevo Gasto"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">

            {/* Fecha + Categoría */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha</Label>
                <Input type="date" value={form.fecha} onChange={e => setS("fecha", e.target.value)} /></div>
              <div className="space-y-1"><Label>Categoría</Label>
                <Select value={form.categoria} onValueChange={v => setS("categoria", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(categoriaCfg) as CategoriaGasto[]).map(c =>
                      <SelectItem key={c} value={c}>{categoriaCfg[c].label}</SelectItem>)}
                    {tiposList.map(t =>
                      <SelectItem key={t.id} value={t.nombre}>{t.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-1"><Label>Descripción *</Label>
              <Input value={form.descripcion} onChange={e => setS("descripcion", e.target.value)}
                placeholder="Ej: Compra de válvulas de repuesto" /></div>

            {/* Monto + Moneda */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2"><Label>Monto *</Label>
                <Input type="number" value={form.monto || ""} onChange={e => setS("monto", Number(e.target.value))}
                  placeholder="0" /></div>
              <div className="space-y-1"><Label>Moneda</Label>
                <Select value={form.moneda} onValueChange={v => setS("moneda", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLP">CLP</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo documento + N° */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Tipo de documento</Label>
                <div className="flex gap-2">
                  {(["boleta", "factura", "otro"] as TipoDocumentoGasto[]).map(t => (
                    <button key={t} type="button" onClick={() => setS("tipoDocumento", t)}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-all"
                      style={form.tipoDocumento === t
                        ? { background: tipoDocCfg[t].color, color: "#fff", borderColor: tipoDocCfg[t].color }
                        : { background: "#f8fafc", color: "#6b7280", borderColor: "#e5e7eb" }}>
                      {tipoDocCfg[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1"><Label>N° {tipoDocCfg[form.tipoDocumento].label}</Label>
                <Input value={form.numeroBoleta ?? ""} onChange={e => setS("numeroBoleta", e.target.value)}
                  placeholder="Ej: 00123456" /></div>
            </div>

            {/* Responsable */}
            <div className="space-y-1"><Label>Responsable *</Label>
              <Input value={form.responsable} onChange={e => setS("responsable", e.target.value)}
                placeholder="Nombre del técnico o responsable" /></div>

            {/* Faena / Proyecto */}
            <div className="space-y-1">
              <Label>Faena / Proyecto</Label>
              <Textarea
                value={form.faenaProyecto ?? ""}
                onChange={e => setS("faenaProyecto", e.target.value)}
                rows={2}
                placeholder="Ej: Faena Minera El Peñón — Sector Norte — OT-2025-045" />
            </div>

            {/* Adjunto */}
            <div className="space-y-2">
              <Label>Documento de respaldo</Label>
              {(form.adjuntoUrl || form.adjuntoBase64) ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                  {form.adjuntoTipo?.startsWith("image/") ? (
                    <img src={adjuntoSrc(form)}
                      alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer"
                      onClick={() => setVisorAdjunto({ ...form, id: "", creadoEn: "" } as Gasto)} />
                  ) : (
                    <div className="w-16 h-16 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                      <FileText size={24} className="text-blue-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{form.adjuntoNombre}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{form.adjuntoTipo}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setVisorAdjunto({ ...form, id: "", creadoEn: "" } as Gasto)}
                      className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                      <Maximize2 size={14} />
                    </button>
                    <button onClick={removeAdjunto}
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" disabled={subiendo} onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-60">
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-500">{subiendo ? "Subiendo archivo…" : "Haz clic para subir imagen o PDF"}</span>
                  <span className="text-xs text-gray-400">PNG, JPG, PDF hasta 10MB</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*,application/pdf"
                className="hidden" onChange={handleFile} />
            </div>

            {/* Estado */}
            <div className="space-y-1"><Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setS("estado", v ?? "")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(estadoCfg) as EstadoGasto[]).map(e =>
                  <SelectItem key={e} value={e}>{estadoCfg[e].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Observaciones */}
            <div className="space-y-1"><Label>Observaciones</Label>
              <Textarea value={form.observaciones ?? ""} onChange={e => setS("observaciones", e.target.value)}
                rows={2} placeholder="Detalles adicionales..." /></div>

            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear gasto"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Tipos de Gasto */}
      <Dialog open={openTipos} onOpenChange={setOpenTipos}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tipos de Gasto</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-gray-500">Además de las categorías base, crea los tipos de gasto que necesites y luego asígnalos a cada gasto.</p>
            <div className="flex gap-2">
              <Input placeholder="Nombre del tipo (ej: Peajes)" value={formTipo.nombre} onChange={e => setFormTipo(f => ({ ...f, nombre: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") agregarTipo() }} />
              <Button onClick={agregarTipo}><Plus size={14} /> Agregar</Button>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {tiposList.length === 0 && <div className="text-sm text-center py-6 text-gray-500">Aún no hay tipos personalizados. Crea el primero arriba.</div>}
              {tiposList.map(t => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="flex-1 text-sm font-medium text-gray-900">{t.nombre}</span>
                  <span className="text-xs text-gray-500">{lista.filter(g => g.categoria === t.nombre).length} gastos</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renombrarTipo(t)}><Pencil size={12} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminarTipo(t.id)}><Trash2 size={12} /></Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}