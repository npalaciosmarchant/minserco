"use client"

import { useEffect, useState } from "react"
import { bodega, bodegas as bodegasStore, movimientos } from "@/lib/store"
import { ItemBodega, MovimientoBodega, Categoria, Bodega } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, ArrowDown, ArrowUp, Package, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { ImportarExcel, campo, pareceDescripcion, parseNumCL } from "@/components/ui/ImportarExcel"

const categorias: { value: Categoria; label: string }[] = [
  { value: "equipo", label: "Equipo" },
  { value: "accesorio", label: "Accesorio" },
  { value: "repuesto", label: "Repuesto" },
  { value: "consumible", label: "Consumible" },
  { value: "herramienta", label: "Herramienta" },
]

const emptyItem = (): Omit<ItemBodega, "id" | "creadoEn" | "actualizadoEn"> => ({
  codigo: "", nombre: "", categoria: "repuesto", descripcion: "", cantidad: 0,
  cantidadMinima: 1, bodega: "", ubicacion: "", proveedor: "", precioUnitario: undefined, unidad: "unidad",
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
  const [stockAbierto, setStockAbierto] = useState(false)
  const [bodegasList, setBodegasList] = useState<Bodega[]>([])
  const [filtroBodega, setFiltroBodega] = useState<string>("todas")
  const [openBodegas, setOpenBodegas] = useState(false)
  const [formBodega, setFormBodega] = useState({ nombre: "", descripcion: "" })

  const cargar = () => {
    setItems(bodega.getAll())
    setMovs(movimientos.getAll().slice().reverse())
    setBodegasList(bodegasStore.getAll())
  }
  useEffect(() => { cargar() }, [])

  function agregarBodega() {
    const nom = formBodega.nombre.trim()
    if (!nom) return
    bodegasStore.add({ nombre: nom, descripcion: formBodega.descripcion.trim() || undefined })
    setFormBodega({ nombre: "", descripcion: "" }); cargar()
  }
  function renombrarBodega(b: Bodega) {
    const nom = prompt("Nuevo nombre de la bodega:", b.nombre)
    if (nom && nom.trim()) { bodegasStore.update(b.id, { nombre: nom.trim() }); cargar() }
  }
  function eliminarBodega(id: string) {
    if (confirm("¿Eliminar esta bodega? Los ítems no se borran, solo quedan sin bodega asignada.")) { bodegasStore.delete(id); cargar() }
  }

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

  function vaciarInventario() {
    const n = bodega.getAll().length
    if (n === 0) { alert("El inventario ya está vacío."); return }
    if (!confirm(`¿Eliminar TODOS los ${n} items del inventario? Esta acción no se puede deshacer.`)) return
    bodega.vaciar(); cargar()
  }

  function mapCategoria(txt: string): Categoria {
    const t = txt.toLowerCase()
    if (t.includes("herramienta")) return "herramienta"
    if (t.includes("equipo")) return "equipo"
    if (t.includes("accesorio")) return "accesorio"
    if (t.includes("consumible")) return "consumible"
    return "repuesto"
  }

  async function importarProductos(rows: Record<string, string>[]) {
    const existentes = new Set(bodega.getAll().map(i => i.nombre.toLowerCase()))
    const base = bodega.getAll().length
    let added = 0, omitted = 0
    for (const r of rows) {
      if (pareceDescripcion(r)) { omitted++; continue }
      const nombre = campo(r, "Nombre")
      if (!nombre) { omitted++; continue }
      if (existentes.has(nombre.toLowerCase())) { omitted++; continue }
      const catTxt = campo(r, "Categoría", "Categoria")
      const desc = campo(r, "Descripción", "Descripcion")
      bodega.add({
        codigo: `IMP-${String(base + added + 1).padStart(4, "0")}`,
        nombre,
        categoria: mapCategoria(catTxt),
        descripcion: [desc, catTxt ? `(Categoría original: ${catTxt})` : ""].filter(Boolean).join("\n"),
        cantidad: parseNumCL(campo(r, "Stock actual", "Stock")),
        cantidadMinima: parseNumCL(campo(r, "Stock mínimo", "Stock minimo")),
        ubicacion: "",
        proveedor: "",
        precioUnitario: parseNumCL(campo(r, "Valor unitario", "Valor")) || undefined,
        unidad: "unidad",
      })
      existentes.add(nombre.toLowerCase()); added++
    }
    cargar()
    return { added, omitted }
  }

  const setIS = (k: string, v: string) => setFormItem(f => ({ ...f, [k]: v }))
  const setIN = (k: string, v: number) => setFormItem(f => ({ ...f, [k]: v }))
  const setMS = (k: string, v: string) => setFormMov(f => ({ ...f, [k]: v }))
  const setMN = (k: string, v: number) => setFormMov(f => ({ ...f, [k]: v }))

  const filtrados = items.filter(i => {
    const q = busqueda.toLowerCase()
    const matchTexto = (i.nombre ?? "").toLowerCase().includes(q) || (i.codigo ?? "").toLowerCase().includes(q)
    const matchBodega = filtroBodega === "todas" ? true : filtroBodega === "__sin" ? !i.bodega : i.bodega === filtroBodega
    return matchTexto && matchBodega
  })
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
          <button className="btn-ghost" onClick={() => setOpenBodegas(true)}><Package size={13} /> Bodegas</button>
          <ImportarExcel label="Importar productos" onRows={importarProductos} />
          <button className="btn-ghost" style={{ color: "#dc2626" }} onClick={vaciarInventario}><Trash2 size={13} /> Vaciar</button>
          <button className="btn-accent" onClick={() => abrirItem()}><Plus size={14} /> Nuevo Item</button>
        </div>
      }
    >

      {stockBajo.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
          <button
            onClick={() => setStockAbierto(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold w-full text-left"
            style={{ color: "#f87171" }}
          >
            {stockAbierto ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <AlertTriangle size={14} />
            {stockBajo.length} item{stockBajo.length > 1 ? "s" : ""} con stock bajo o agotado
            <span className="ml-auto text-xs font-medium" style={{ opacity: 0.75 }}>
              {stockAbierto ? "Ocultar" : "Ver detalle"}
            </span>
          </button>
          {stockAbierto && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {stockBajo.map(i => (
                <span key={i.id} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(248,113,113,0.15)", color: "#fca5a5" }}>
                  {i.nombre} ({i.cantidad} {i.unidad})
                </span>
              ))}
            </div>
          )}
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
          {bodegasList.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => setFiltroBodega("todas")} className={`filter-pill${filtroBodega === "todas" ? " active" : ""}`}>Todas las bodegas</button>
              {bodegasList.map(b => (
                <button key={b.id} onClick={() => setFiltroBodega(b.nombre)} className={`filter-pill${filtroBodega === b.nombre ? " active" : ""}`}>{b.nombre} ({items.filter(i => i.bodega === b.nombre).length})</button>
              ))}
              {items.some(i => !i.bodega) && <button onClick={() => setFiltroBodega("__sin")} className={`filter-pill${filtroBodega === "__sin" ? " active" : ""}`}>Sin bodega ({items.filter(i => !i.bodega).length})</button>}
            </div>
          )}
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
                        {i.bodega && <span>🏬 {i.bodega}</span>}
                        {i.ubicacion && <span>📍 {i.ubicacion}</span>}
                        {i.proveedor && <span>· {i.proveedor}</span>}
                        {i.precioUnitario && <span>· ${i.precioUnitario.toLocaleString()}</span>}
                      </div>
                      {bodegasList.length > 0 && (
                        <div className="mt-1.5" onClick={e => e.stopPropagation()}>
                          <select value={i.bodega || "__none"} onChange={e => { const v = e.target.value; bodega.update(i.id, { bodega: v === "__none" ? "" : v }); cargar() }}
                            className="text-xs rounded-md border px-1.5 py-1 bg-transparent outline-none" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
                            <option value="__none">Sin bodega</option>
                            {bodegasList.map(b => <option key={b.id} value={b.nombre}>{b.nombre}</option>)}
                          </select>
                        </div>
                      )}
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
              <div className="space-y-1"><Label>Bodega</Label>
                <Select value={formItem.bodega ? formItem.bodega : "__none"} onValueChange={v => setIS("bodega", v === "__none" ? "" : (v ?? ""))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sin bodega</SelectItem>
                    {bodegasList.map(b => <SelectItem key={b.id} value={b.nombre}>{b.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Ubicación / Estante</Label><Input value={formItem.ubicacion} onChange={e => setIS("ubicacion", e.target.value)} placeholder="Estante A-1" /></div>
            </div>
            <div className="space-y-1"><Label>Proveedor</Label><Input value={formItem.proveedor ?? ""} onChange={e => setIS("proveedor", e.target.value)} /></div>
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
      <Dialog open={openBodegas} onOpenChange={setOpenBodegas}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Bodegas / Almacenes</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>Crea las bodegas que necesites y luego asigna cada ítem a una.</p>
            <div className="flex gap-2">
              <Input placeholder="Nombre de la bodega (ej: Bodega Copiapó)" value={formBodega.nombre} onChange={e => setFormBodega(f => ({ ...f, nombre: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") agregarBodega() }} />
              <Button onClick={agregarBodega}><Plus size={14} /> Agregar</Button>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {bodegasList.length === 0 && <div className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>Aún no hay bodegas. Crea la primera arriba.</div>}
              {bodegasList.map(b => (
                <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
                  <span className="flex-1 text-sm font-medium" style={{ color: "var(--foreground)" }}>{b.nombre}</span>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{items.filter(i => i.bodega === b.nombre).length} ítems</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renombrarBodega(b)}><Pencil size={12} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminarBodega(b.id)}><Trash2 size={12} /></Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </PageShell>
  )
}
