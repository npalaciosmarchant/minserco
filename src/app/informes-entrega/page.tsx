"use client"

import { useEffect, useState } from "react"
import { informesEntrega } from "@/lib/store"
import { InformeEntrega, EstadoEquipoEntrega, EstadoInformeEntrega } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, ClipboardCheck, Download, CheckCircle2, FileText, X } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

const estadoEquipoCfg: Record<EstadoEquipoEntrega, { label: string; color: string; bg: string }> = {
  excelente:   { label: "Excelente",   color: "#059669", bg: "#f0fdf4" },
  bueno:       { label: "Bueno",       color: "#2563eb", bg: "#eff6ff" },
  regular:     { label: "Regular",     color: "#d97706", bg: "#fffbeb" },
  con_fallas:  { label: "Con fallas",  color: "#dc2626", bg: "#fef2f2" },
}

const estadoInformeCfg: Record<EstadoInformeEntrega, { label: string; color: string; bg: string }> = {
  borrador: { label: "Borrador", color: "#64748b", bg: "#f8fafc" },
  emitido:  { label: "Emitido",  color: "#059669", bg: "#f0fdf4" },
}

function emptyForm(): Omit<InformeEntrega, "id" | "creadoEn"> {
  return {
    numero: "",
    equipo: "",
    numeroSerie: "",
    cliente: "",
    empresa: "",
    direccion: "",
    tecnico: "",
    fechaEntrega: new Date().toISOString().slice(0, 10),
    estadoEquipo: "bueno",
    descripcionEntrega: "",
    itemsEntregados: [""],
    observaciones: "",
    estado: "borrador",
  }
}

function generarPDF(inf: InformeEntrega) {
  const eq = estadoEquipoCfg[inf.estadoEquipo]
  const logoUrl = window.location.origin + "/logo_minserco.png?v=2"
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Georgia, serif; margin: 0; padding: 40px; color: #111; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1a3673; padding-bottom: 20px; margin-bottom: 24px; }
  .logo-img { height: 80px; width: auto; object-fit: contain; }
  .doc-title { font-size: 18px; font-weight: 700; color: #1a3673; text-align: right; }
  .doc-num { font-size: 13px; color: #64748b; text-align: right; margin-top: 4px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .section { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
  .section h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 0 0 12px; }
  .field { margin-bottom: 8px; }
  .field-label { font-size: 11px; color: #64748b; margin-bottom: 2px; }
  .field-value { font-size: 13px; font-weight: 600; color: #111; }
  .estado-badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 700; background: ${eq.bg}; color: ${eq.color}; border: 1px solid ${eq.color}30; }
  .items-list { list-style: none; padding: 0; margin: 0; }
  .items-list li { padding: 6px 0; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .items-list li:last-child { border-bottom: none; }
  .items-list li::before { content: "✓ "; color: #059669; font-weight: 700; }
  .firma-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
  .firma-box { border-top: 2px solid #334155; padding-top: 10px; }
  .firma-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <div>
    <img src="${logoUrl}" alt="Minserco" class="logo-img" />
  </div>
  <div>
    <div class="doc-title">INFORME DE ENTREGA</div>
    <div class="doc-num">${inf.numero}</div>
    <div class="doc-num">Fecha: ${inf.fechaEntrega}</div>
  </div>
</div>

<div class="grid2">
  <div class="section">
    <h3>Datos del Equipo</h3>
    <div class="field"><div class="field-label">Equipo</div><div class="field-value">${inf.equipo}</div></div>
    ${inf.numeroSerie ? `<div class="field"><div class="field-label">N° Serie</div><div class="field-value">${inf.numeroSerie}</div></div>` : ""}
    <div class="field"><div class="field-label">Estado del equipo</div><div style="margin-top:4px;"><span class="estado-badge">${eq.label}</span></div></div>
  </div>
  <div class="section">
    <h3>Datos del Cliente</h3>
    <div class="field"><div class="field-label">Cliente</div><div class="field-value">${inf.cliente}</div></div>
    ${inf.empresa ? `<div class="field"><div class="field-label">Empresa</div><div class="field-value">${inf.empresa}</div></div>` : ""}
    ${inf.direccion ? `<div class="field"><div class="field-label">Dirección</div><div class="field-value">${inf.direccion}</div></div>` : ""}
    <div class="field"><div class="field-label">Técnico responsable</div><div class="field-value">${inf.tecnico}</div></div>
  </div>
</div>

<div class="section" style="margin-bottom:20px;">
  <h3>Descripción de la entrega</h3>
  <p style="margin:0;line-height:1.6;">${inf.descripcionEntrega}</p>
</div>

${inf.itemsEntregados.filter(Boolean).length > 0 ? `
<div class="section" style="margin-bottom:20px;">
  <h3>Ítems entregados</h3>
  <ul class="items-list">
    ${inf.itemsEntregados.filter(Boolean).map(item => `<li>${item}</li>`).join("")}
  </ul>
</div>` : ""}

${inf.observaciones ? `
<div class="section" style="margin-bottom:20px;">
  <h3>Observaciones</h3>
  <p style="margin:0;line-height:1.6;">${inf.observaciones}</p>
</div>` : ""}

<div class="firma-section">
  <div class="firma-box">
    <div style="height:60px;"></div>
    <div class="firma-label">Firma Técnico Minserco</div>
    <div style="font-size:12px;color:#334155;margin-top:4px;">${inf.tecnico}</div>
  </div>
  <div class="firma-box">
    <div style="height:60px;"></div>
    <div class="firma-label">Firma y Timbre Cliente</div>
    <div style="font-size:12px;color:#334155;margin-top:4px;">${inf.cliente}${inf.empresa ? ` — ${inf.empresa}` : ""}</div>
  </div>
</div>

<div class="footer">
  Minserco SpA · Sistema de Gestión Operacional · ${inf.numero} · ${new Date().toLocaleDateString("es-CL")}
</div>
</body>
</html>`

  const w = window.open("", "_blank")
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 500)
}

export default function InformesEntregaPage() {
  const [lista, setLista] = useState<InformeEntrega[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<InformeEntrega | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [filtro, setFiltro] = useState<EstadoInformeEntrega | "todos">("todos")

  const cargar = () => setLista(informesEntrega.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function abrir(inf?: InformeEntrega) {
    if (inf) { setEditando(inf); const { id, creadoEn, ...r } = inf; setForm(r) }
    else { setEditando(null); setForm({ ...emptyForm(), numero: informesEntrega.nextNumero() }) }
    setOpen(true)
  }

  function guardar() {
    if (!form.equipo || !form.cliente || !form.tecnico) return
    editando ? informesEntrega.update(editando.id, form) : informesEntrega.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar informe?")) return
    informesEntrega.delete(id); cargar()
  }

  function emitir(inf: InformeEntrega) {
    informesEntrega.update(inf.id, { estado: "emitido" }); cargar()
  }

  const setS = (k: string, v: string | string[]) => setForm(f => ({ ...f, [k]: v }))

  function setItem(idx: number, val: string) {
    const items = [...form.itemsEntregados]
    items[idx] = val
    setForm(f => ({ ...f, itemsEntregados: items }))
  }
  function addItem() { setForm(f => ({ ...f, itemsEntregados: [...f.itemsEntregados, ""] })) }
  function removeItem(idx: number) {
    setForm(f => ({ ...f, itemsEntregados: f.itemsEntregados.filter((_, i) => i !== idx) }))
  }

  const filtrada = filtro === "todos" ? lista : lista.filter(i => i.estado === filtro)

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Borradores", value: lista.filter(i => i.estado === "borrador").length, color: "#64748b" },
    { label: "Emitidos", value: lista.filter(i => i.estado === "emitido").length, color: "#059669" },
  ]

  return (
    <PageShell
      icon={ClipboardCheck}
      title="Informes de Entrega"
      subtitle="Documentación de entrega de equipos al cliente"
      color="#059669"
      stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Informe</button>}
    >
      {/* Filtros */}
      <div className="flex gap-1.5 mb-5">
        {(["todos", "borrador", "emitido"] as const).map(f => (
          <button key={f} className={`filter-pill${filtro === f ? " active" : ""}`} onClick={() => setFiltro(f)}>
            {f === "todos" ? `Todos (${lista.length})` : `${estadoInformeCfg[f as EstadoInformeEntrega]?.label} (${lista.filter(i => i.estado === f).length})`}
          </button>
        ))}
      </div>

      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtrada.length === 0 && (
          <div className="col-span-3 empty-state glass-section"><ClipboardCheck size={40} /><p>No hay informes registrados</p></div>
        )}
        {filtrada.map(inf => {
          const eq = estadoEquipoCfg[inf.estadoEquipo]
          const est = estadoInformeCfg[inf.estado]
          return (
            <div key={inf.id} className="glass-card p-4 group">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs font-mono text-blue-600 font-semibold">{inf.numero}</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">{inf.equipo}</div>
                  {inf.numeroSerie && <div className="text-xs text-gray-400">S/N: {inf.numeroSerie}</div>}
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-semibold shrink-0"
                  style={{ background: est.bg, color: est.color }}>{est.label}</span>
              </div>

              <div className="space-y-1.5 mb-3 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Cliente:</span>
                  <span className="font-medium text-gray-800">{inf.cliente}{inf.empresa ? ` — ${inf.empresa}` : ""}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Técnico:</span>
                  <span className="font-medium text-gray-800">{inf.tecnico}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Fecha entrega:</span>
                  <span className="font-medium text-gray-800">{inf.fechaEntrega}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">Estado equipo:</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                    style={{ background: eq.bg, color: eq.color }}>{eq.label}</span>
                </div>
              </div>

              {inf.itemsEntregados.filter(Boolean).length > 0 && (
                <div className="text-xs text-gray-500 mb-3">
                  {inf.itemsEntregados.filter(Boolean).length} ítem(s) entregado(s)
                </div>
              )}

              <div className="flex gap-1.5 pt-3 border-t border-gray-100">
                <button onClick={() => generarPDF(inf)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors">
                  <Download size={12} /> PDF
                </button>
                {inf.estado === "borrador" && (
                  <button onClick={() => emitir(inf)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors">
                    <CheckCircle2 size={12} /> Emitir
                  </button>
                )}
                <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(inf)}><Pencil size={12} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(inf.id)}><Trash2 size={12} /></Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Informe" : "Nuevo Informe de Entrega"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>N° Informe</Label>
                <Input value={form.numero} onChange={e => setS("numero", e.target.value)} /></div>
              <div className="space-y-1"><Label>Fecha Entrega</Label>
                <Input type="date" value={form.fechaEntrega} onChange={e => setS("fechaEntrega", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Equipo *</Label>
                <Input value={form.equipo} onChange={e => setS("equipo", e.target.value)} placeholder="Nombre del equipo" /></div>
              <div className="space-y-1"><Label>N° Serie</Label>
                <Input value={form.numeroSerie ?? ""} onChange={e => setS("numeroSerie", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cliente *</Label>
                <Input value={form.cliente} onChange={e => setS("cliente", e.target.value)} /></div>
              <div className="space-y-1"><Label>Empresa</Label>
                <Input value={form.empresa ?? ""} onChange={e => setS("empresa", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Técnico *</Label>
                <Input value={form.tecnico} onChange={e => setS("tecnico", e.target.value)} /></div>
              <div className="space-y-1"><Label>Estado del equipo</Label>
                <Select value={form.estadoEquipo} onValueChange={v => setS("estadoEquipo", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(estadoEquipoCfg) as EstadoEquipoEntrega[]).map(e =>
                    <SelectItem key={e} value={e}>{estadoEquipoCfg[e].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Dirección del cliente</Label>
              <Input value={form.direccion ?? ""} onChange={e => setS("direccion", e.target.value)} /></div>
            <div className="space-y-1"><Label>Descripción de la entrega *</Label>
              <Textarea value={form.descripcionEntrega} onChange={e => setS("descripcionEntrega", e.target.value)}
                rows={3} placeholder="Describe el estado del equipo, trabajo realizado y condiciones de entrega..." /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ítems entregados</Label>
                <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Agregar ítem</button>
              </div>
              <div className="space-y-2">
                {form.itemsEntregados.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input value={item} onChange={e => setItem(idx, e.target.value)}
                      placeholder={`Ítem ${idx + 1}: ej. Manual de operación`} />
                    {form.itemsEntregados.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400 shrink-0" onClick={() => removeItem(idx)}>
                        <X size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1"><Label>Observaciones</Label>
              <Textarea value={form.observaciones ?? ""} onChange={e => setS("observaciones", e.target.value)} rows={2} /></div>
            <div className="space-y-1"><Label>Estado del informe</Label>
              <Select value={form.estado} onValueChange={v => setS("estado", v ?? "")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="emitido">Emitido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear informe"}</Button>
          </div>
           </DialogContent>
      </Dialog>
    </PageShell>
  )
}
