"use client"

import { useEffect, useState } from "react"
import { pagos } from "@/lib/store"
import { Pago, EstadoPago } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Wallet, User, Calendar } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { FiltroMes, mesActual, enMes } from "@/components/ui/FiltroMes"
import { SelectUsuario } from "@/components/ui/SelectUsuario"

const estadoCfg: Record<EstadoPago, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "#d97706" },
  pagado:    { label: "Pagado",    color: "#059669" },
  vencido:   { label: "Vencido",   color: "#dc2626" },
}
const tipoCfg: Record<string, { label: string; color: string }> = {
  por_pagar:  { label: "Por pagar",  color: "#dc2626" },
  por_cobrar: { label: "Por cobrar", color: "#059669" },
}

function emptyForm(): Omit<Pago, "id" | "creadoEn"> {
  return { concepto: "", tipo: "por_pagar", contraparte: "", monto: 0, moneda: "CLP", fechaVencimiento: new Date().toISOString().slice(0, 10), estado: "pendiente", responsable: "", notas: "" }
}

const diasRestantes = (fecha?: string) => fecha ? Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000) : null
const fmtMonto = (m?: number, mon?: string) => (m ?? 0).toLocaleString("es-CL", { style: "currency", currency: mon === "USD" ? "USD" : "CLP", maximumFractionDigits: 0 })
const fmtFecha = (f?: string) => { if (!f) return "—"; const p = f.split("-"); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : f }

export default function PagosPage() {
  const [lista, setLista] = useState<Pago[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Pago | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [mes, setMes] = useState(mesActual())
  const cargar = () => setLista(pagos.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])
  const setS = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }) as unknown as typeof f)

  function abrir(p?: Pago) {
    if (p) { setEditando(p); const { id, creadoEn, ...r } = p; void id; void creadoEn; setForm({ ...emptyForm(), ...r }) }
    else { setEditando(null); setForm(emptyForm()) }
    setOpen(true)
  }
  function guardar() {
    if (!form.concepto.trim()) { alert("El concepto es obligatorio."); return }
    if (editando) pagos.update(editando.id, form); else pagos.add(form)
    cargar(); setOpen(false)
  }
  function eliminar(id: string) { if (confirm("¿Eliminar este pago?")) { pagos.delete(id); cargar() } }

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Pendientes", value: lista.filter(p => p.estado === "pendiente").length, color: "#d97706" },
    { label: "Por vencer (7d)", value: lista.filter(p => { const d = diasRestantes(p.fechaVencimiento); return p.estado !== "pagado" && d !== null && d <= 7 }).length, color: "#dc2626" },
  ]

  const filtrada = lista.filter(p => enMes(p.fechaVencimiento, mes))

  return (
    <PageShell icon={Wallet} title="Pagos" subtitle="Pagos por pagar/cobrar con alerta de vencimiento" color="#7c3aed" stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Pago</button>}>
      <FiltroMes value={mes} onChange={setMes} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtrada.length === 0 && <div className="col-span-3 empty-state glass-section"><Wallet size={40} /><p>No hay pagos en este período</p></div>}
        {filtrada.map(p => {
          const est = estadoCfg[p.estado]
          const tip = tipoCfg[p.tipo ?? "por_pagar"]
          const d = diasRestantes(p.fechaVencimiento)
          const alerta = p.estado !== "pagado" && d !== null && d <= 7
          return (
            <div key={p.id} className="glass-card p-4 group" style={alerta ? { borderColor: d! < 0 ? "#dc2626" : "#d97706" } : undefined}>
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>{p.concepto}</div>
                  {p.contraparte && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{p.contraparte}</div>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: est.color + "20", color: est.color }}>{est.label}</span>
              </div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{fmtMonto(p.monto, p.moneda)}</span>
                {tip && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: tip.color + "18", color: tip.color }}>{tip.label}</span>}
              </div>
              <div className="text-xs space-y-1" style={{ color: "var(--muted-foreground)" }}>
                <div className="flex items-center gap-1"><Calendar size={11} />Vence: {fmtFecha(p.fechaVencimiento)}</div>
                {d !== null && p.estado !== "pagado" && (
                  <div style={{ color: d < 0 ? "#dc2626" : d <= 7 ? "#d97706" : "var(--muted-foreground)", fontWeight: alerta ? 600 : 400 }}>
                    {d < 0 ? `Vencido hace ${Math.abs(d)} día(s)` : d === 0 ? "Vence HOY" : `Faltan ${d} día(s)`}
                  </div>
                )}
                {p.responsable && <div className="flex items-center gap-1"><User size={11} />{p.responsable}</div>}
              </div>
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(p)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(p.id)}><Trash2 size={13} /></Button>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? "Editar Pago" : "Nuevo Pago"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1"><Label>Concepto *</Label><Input value={form.concepto} onChange={e => setS("concepto", e.target.value)} placeholder="Ej: Factura proveedor X, arriendo oficina…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Tipo</Label>
                <Select value={form.tipo ?? "por_pagar"} onValueChange={v => setS("tipo", v ?? "por_pagar")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(tipoCfg).map(k => <SelectItem key={k} value={k}>{tipoCfg[k].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Contraparte</Label><Input value={form.contraparte ?? ""} onChange={e => setS("contraparte", e.target.value)} placeholder="Proveedor / Cliente" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Monto</Label><Input type="number" min={0} value={form.monto ?? 0} onChange={e => setS("monto", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Moneda</Label>
                <Select value={form.moneda ?? "CLP"} onValueChange={v => setS("moneda", v ?? "CLP")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="CLP">CLP</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha de vencimiento</Label><Input type="date" value={form.fechaVencimiento ?? ""} onChange={e => setS("fechaVencimiento", e.target.value)} /></div>
              <div className="space-y-1"><Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setS("estado", v ?? "pendiente")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(estadoCfg) as EstadoPago[]).map(k => <SelectItem key={k} value={k}>{estadoCfg[k].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Responsable (recibe alertas)</Label><SelectUsuario value={form.responsable ?? ""} onChange={v => setS("responsable", v)} /></div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={form.notas ?? ""} onChange={e => setS("notas", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear pago"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
