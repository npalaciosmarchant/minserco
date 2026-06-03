"use client"

import { useEffect, useState, useRef } from "react"
import { gastos } from "@/lib/store"
import { Gasto, CategoriaGasto, EstadoGasto, TipoDocumentoGasto } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Pencil, Trash2, Receipt, CheckCircle2, Clock,
  XCircle, Send, Upload, Maximize2, FileImage, FileText, X, Download,
} from "lucide-react"
import { imprimirGastosPDF } from "@/lib/gastos-pdf"
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
    adjuntoNombre: "",
    adjuntoTipo: "",
    estado: "borrador",
    observaciones: "",
  }
}

// Visor de imagen/PDF maximizado
function AdjuntoViewer({ base64, tipo, nombre, onClose }: {
  base64: string; tipo: string; nombre: string; onClose: () => void
}) {
  const isPDF = tipo === "application/pdf"
  const src = `data:${tipo};base64,${base64}`
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
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaGasto | "todos">("todos")
  const [visorAdjunto, setVisorAdjunto] = useState<Gasto | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" })

  const cargar = () => setLista(gastos.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      // result is "data:image/png;base64,..."
      const base64 = result.split(",")[1]
      setForm(f => ({
        ...f,
        adjuntoBase64: base64,
        adjuntoNombre: file.name,
        adjuntoTipo: file.type,
      }))
    }
    reader.readAsDataURL(file)
  }

  function removeAdjunto() {
    setForm(f => ({ ...f, adjuntoBase64: "", adjuntoNombre: "", adjuntoTipo: "" }))
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
          <button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Gasto</button>
        </div>
      }
    >
      {/* Visor maximizado */}
      {visorAdjunto?.adjuntoBase64 && (
        <AdjuntoViewer
          base64={visorAdjunto.adjuntoBase64}
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
          value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value as CategoriaGasto | "todos")}>
          <option value="todos">Todas las categorías</option>
          {(Object.keys(categoriaCfg) as CategoriaGasto[]).map(c => (
            <option key={c} value={c}>{categoriaCfg[c].label}</option>
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
            const cat = categoriaCfg[g.categoria]
            const est = estadoCfg[g.estado]
            const EstIcon = est.Icon
            const tipoDoc = tipoDocCfg[g.tipoDocumento ?? "otro"]
            return (
              <div key={g.id} className="group flex items-start gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
                style={{ borderBottom: i < paged.length - 1 ? "1px solid #f1f5f9" : "none" }}>

                {/* Adjunto thumbnail */}
                <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center cursor-pointer relative"
                  style={{ background: cat.bg, border: `1px solid ${cat.color}30` }}
                  onClick={() => g.adjuntoBase64 ? setVisorAdjunto(g) : undefined}>
                  {g.adjuntoBase64 ? (
                    <>
                      {g.adjuntoTipo?.startsWith("image/")
                        ? <img src={`data:${g.adjuntoTipo};base64,${g.adjuntoBase64}`}
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
                  {g.adjuntoBase64 && (
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
                  <SelectContent>{(Object.keys(categoriaCfg) as CategoriaGasto[]).map(c =>
                    <SelectItem key={c} value={c}>{categoriaCfg[c].label}</SelectItem>)}</SelectContent>
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
              {form.adjuntoBase64 ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50">
                  {form.adjuntoTipo?.startsWith("image/") ? (
                    <img src={`data:${form.adjuntoTipo};base64,${form.adjuntoBase64}`}
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
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all">
                  <Upload size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Haz clic para subir imagen o PDF</span>
                  <span className="text-xs text-gray-400">PNG, JPG, PDF hasta 5MB</span>
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
    </PageShell>
  )
}