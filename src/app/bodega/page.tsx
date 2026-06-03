"use client"

import { useEffect, useState } from "react"
import { bodega, movimientos } from "@/lib/store"
import { ItemBodega, MovimientoBodega, Categoria } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, ArrowDown, ArrowUp, Package, AlertTriangle } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

const categorias: { value: Categoria; label: string }[] = [
  { value: "equipo", label: "Equipo" },
  { value: "accesorio", label: "Accesorio" },
  { value: "repuesto", label: "Repuesto" },
  { value: "consumible", label: "Consumible" },
  { value: "herramienta", label: "Herramienta" },
]

const emptyItem = (): Omit<ItemBodega, "id" | "creadoEn" | "actualizadoEn"> => ({
  codigo: "", nombre: "", categoria: "repuesto", descripcion: "", cantidad: 0,
  cantidadMinima: 1, ubicacion: "", proveedor: "", precioUnitario: undefined, unidad: "unidad",
})

const emptyMov = (): Omit<MovimientoBodega, "id" | "creadoEn"> => ({
  itemId: "", tipo: "entrada", cantidad: 1, motivo: "", referencia: "",
  fecha: new Date().toISOString().slice(0, 10), responsable: "",
})

export default function BodegaPage() {
  const [items, setItems] = useState<ItemBodega[]>([])
  const [movs, setMovs] = useState<MovimientoBodega[]>([])
  const [openItem, setOpenItem] = useState(false)
  const [openMov, setOpenMov] = useState(false)
  const [editando, setEditando] = useState<ItemBodega | null>(null)
  const [formItem, setFormItem] = useState(emptyItem())
  const [formMov, setFormMov] = useState(emptyMov())
  const [busqueda, setBusqueda] = useState("")

  const cargar = () => {
    setItems(bodega.getAll())
    setMovs(movimientos.getAll().slice().reverse())
  }
  useEffect(() => { cargar() }, [])

  function abrirItem(i?: ItemBodega) {
    if (i) { setEditando(i); const { id, creadoEn, actualizadoEn, ...r } = i; setFormItem(r) }
    else { setEditando(null); setFormItem(emptyItem()) }
    setOpenItem(true)
  }

  function guardarItem() {
    if (!formItem.nombre || !formItem.codigo) return
    editando ? bodega.update(editando.id, formItem) : bodega.add(formItem)
    cargar(); setOpenItem(false)
  }

  function abrirMov(itemId?: string) {
    setFormMov({ ...emptyMov(), itemId: itemId ?? "" })
    setOpenMov(true)
  }

  function guardarMov() {
    if (!formMov.itemId || !formMov.motivo || !formMov.responsable) return
    movimientos.add(formMov); cargar(); setOpenMov(false)
  }

  function eliminarItem(id: string) {
    if (!confirm("Confirmar eliminación?")) return
    bodega.delete(id); cargar()
  }

  const setIS = (k: string, v: string) => setFormItem(f => ({ ...f, [k]: v }))
  const setIN = (k: string, v: number) => setFormItem(f => ({ ...f, [k]: v }))
  const setMS = (k: string, v: string) => setFormMov(f => ({ ...f, [k]: v }))
  const setMN = (k: string, v: number) => setFormMov(f => ({ ...f, [k]: v }))

  const filtrados = items.filter(i =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.codigo.toLowerCase().includes(busqueda.toLowerCase())
  )
  const stockBajo = items.filter(i => i.cantidad <= i.cantidadMinima)
  const nombreItem = (id: string) => items.find(i => i.id === id)?.nombre ?? "(Producto eliminado)"

  const valorStock = items.reduce((s, i) => s + i.cantidad * (i.precioUnitario ?? 0), 0)
  const valorSalidas = movs.filter(m => m.tipo === "salida").reduce((s, m) => {
    const precio = items.find(i => i.id === m.itemId)?.precioUnitario ?? 0
    return s + m.cantidad * precio
  }, 0)
  const fmtClp = (v: number) => v.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })

  const bodegaStats = [
    { label: "Items", value: items.length },
    { label: "Stock bajo", value: stockBajo.length, color: stockBajo.length > 0 ? "#f87171" : undefined },
    { label: "Valor stock", value: valorStock > 0 ? fmtClp(valorStock) : "—", color: "#059669" },
  ]

  return (
    <PageShell
      icon={Package}
      title="Control Bodega"
      subtitle="Inventario de equipos, accesorios y repuestos"
      color="#34d399"
      stats={bodegaStats}
      actions={
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => abrirMov()}><ArrowDown size={13} /> Movimiento</button>
          <button className="btn-accent" onClick={() => abrirItem()}><Plus size={14} /> Nuevo Item</button>
        </div>
      }
    >

      {stockBajo.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
          <div className="flex items-center gap-2 text-sm font-semibold mb-1" style={{ color: "#f87171" }}>
            <AlertTriangle size={14} />
            {stockBajo.length} item{stockBajo.length > 1 ? "s" : ""} con stock bajo o agotado
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {stockBajo.map(i => (
              <span key={i.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.15)", color: "#fca5a5" }}>
                {i.nombre} ({i.cantidad} {i.unidad})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Resumen financiero */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Valor total en stock</div>
          <div className="text-2xl font-bold" style={{ color: "#059669" }}>
            {valorStock > 0 ? fmtClp(valorStock) : <span style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Sin precios cargados</span>}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            {items.filter(i => i.precioUnitario).length} de {items.length} items con precio
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Total retirado en salidas</div>
          <div className="text-2xl font-bold" style={{ color: "#f87171" }}>
            {valorSalidas > 0 ? fmtClp(valorSalidas) : <span style={{ color: "var(--muted-foreground)", fontSize: "0.875rem" }}>Sin salidas valoradas</span>}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
            {movs.filter(m => m.tipo === "salida").length} movimientos de salida registrados
          </div>
        </div>
      </div>

      <Tabs defaultValue="inventario">
        <TabsList className="mb-5">
          <TabsTrigger value="inventario">Inventario ({items.length})</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos ({movs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="inventario">
          <div className="mb-4">
            <Input
              placeholder="Buscar por nombre o código..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="space-y-2">
            {filtrados.length === 0 && (
              <div className="py-16 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No hay items en inventario.</div>
            )}
            {filtrados.map(i => {
              const bajo = i.cantidad <= i.cantidadMinima
              const pct = Math.min(100, (i.cantidad / Math.max(1, i.cantidadMinima * 3)) * 100)
              return (
                <div
                  key={i.id}
                  className="rounded-xl p-3.5 transition-all hover:scale-[1.003]"
                  style={{ background: "var(--card)", border: `1px solid ${bajo ? "rgba(248,113,113,0.3)" : "var(--border)"}` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{i.nombre}</span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>{i.codigo}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full capitalize" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>{i.categoria}</span>
                        {bajo && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>
                            <AlertTriangle size={10} /> Stock bajo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-lg font-bold" style={{ color: bajo ? "#f87171" : "#34d399" }}>
                          {i.cantidad}
                        </span>
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{i.unidad}</span>
                        <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>mín: {i.cantidadMinima}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: bajo ? "#f87171" : "#34d399" }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {i.ubicacion && <span>📍 {i.ubicacion}</span>}
                        {i.proveedor && <span>· {i.proveedor}</span>}
                        {i.precioUnitario && <span>· ${i.precioUnitario.toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0 items-center">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => abrirMov(i.id)}>
                        <ArrowDown size={11} className="mr-1" />Mov.
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 hover:opacity-100" onClick={() => abrirItem(i)}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 hover:opacity-100 text-red-400" onClick={() => eliminarItem(i.id)}><Trash2 size={13} /></Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="movimientos">
          <div className="space-y-2">
            {movs.length === 0 && (
              <div className="py-16 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No hay movimientos registrados.</div>
            )}
            {movs.map(m => (
              <div key={m.id} className="rounded-xl p-3.5" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={m.tipo === "entrada"
                      ? { background: "rgba(45,212,191,0.12)" }
                      : { background: "rgba(248,113,113,0.12)" }
                    }
                  >
                    {m.tipo === "entrada"
                      ? <ArrowDown size={14} style={{ color: "#0891b2" }} />
                      : <ArrowUp size={14} style={{ color: "#f87171" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: "var(--foreground)" }}>{m.nombreItem ?? nombreItem(m.itemId)}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full capitalize" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>{m.tipo}</span>
                      <span className="text-sm font-bold" style={{ color: m.tipo === "entrada" ? "#2dd4bf" : "#f87171" }}>
                        {m.tipo === "entrada" ? "+" : "-"}{m.cantidad}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      <span>{m.motivo}</span>
                      {m.referencia && <span>· {m.referencia}</span>}
                      <span>· {m.fecha}</span>
                      <span>· {m.responsable}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Item */}
      <Dialog open={openItem} onOpenChange={setOpenItem}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Item" : "Nuevo Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nombre *</Label><Input value={formItem.nombre} onChange={e => setIS("nombre", e.target.value)} /></div>
              <div className="space-y-1"><Label>Código *</Label><Input value={formItem.codigo} onChange={e => setIS("codigo", e.target.value)} placeholder="BOD-0001" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Select value={formItem.categoria} onValueChange={v => setIS("categoria", v ?? "repuesto")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categorias.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Unidad</Label><Input value={formItem.unidad} onChange={e => setIS("unidad", e.target.value)} placeholder="unidad, kg, lt..." /></div>
            </div>
            <div className="space-y-1"><Label>Descripción</Label><Textarea value={formItem.descripcion ?? ""} onChange={e => setIS("descripcion", e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cantidad</Label><Input type="number" min={0} value={formItem.cantidad} onChange={e => setIN("cantidad", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Cantidad mínima</Label><Input type="number" min={0} value={formItem.cantidadMinima} onChange={e => setIN("cantidadMinima", Number(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Ubicación</Label><Input value={formItem.ubicacion} onChange={e => setIS("ubicacion", e.target.value)} placeholder="Estante A-1" /></div>
              <div className="space-y-1"><Label>Proveedor</Label><Input value={formItem.proveedor ?? ""} onChange={e => setIS("proveedor", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Precio unitario ($)</Label><Input type="number" value={formItem.precioUnitario ?? ""} onChange={e => setIN("precioUnitario", Number(e.target.value))} /></div>
            <Button className="w-full" onClick={guardarItem}>{editando ? "Guardar cambios" : "Agregar item"}</Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Dialog Movimiento */}
      <Dialog open={openMov} onOpenChange={setOpenMov}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Movimiento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Item *</Label>
              <Select value={formMov.itemId} onValueChange={v => setMS("itemId", v ?? "")}>
                <SelectTrigger>
                  {formMov.itemId
                    ? (() => { const it = items.find(i => i.id === formMov.itemId); return <span>{it ? `${it.nombre} (stock: ${it.cantidad})` : "Seleccionar item..."}</span> })()
                    : <SelectValue placeholder="Seleccionar item..." />}
                </SelectTrigger>
                <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre} (stock: {i.cantidad})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={formMov.tipo} onValueChange={v => setMS("tipo", v ?? "entrada")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Cantidad *</Label><Input type="number" min={1} value={formMov.cantidad} onChange={e => setMN("cantidad", Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1"><Label>Motivo *</Label><Input value={formMov.motivo} onChange={e => setMS("motivo", e.target.value)} placeholder="Uso en reparación, compra..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Referencia</Label><Input value={formMov.referencia ?? ""} onChange={e => setMS("referencia", e.target.value)} placeholder="N° OT, factura..." /></div>
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={formMov.fecha} onChange={e => setMS("fecha", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Responsable *</Label><Input value={formMov.responsable} onChange={e => setMS("responsable", e.target.value)} /></div>
            <Button className="w-full" onClick={guardarMov}>Registrar movimiento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
