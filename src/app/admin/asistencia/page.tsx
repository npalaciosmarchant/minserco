"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ExcelJS from "exceljs"
import { useAuth } from "@/lib/auth"
import { asistencias, asistenciaConfig, usuarios, notificaciones } from "@/lib/store"
import { Asistencia, Notificacion, UbicacionAsistencia } from "@/lib/types"
import PageShell from "@/components/layout/PageShell"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Clock, Save, AlertTriangle, CalendarDays, Users, CheckCircle2, MapPin, BellRing, X, ExternalLink, Pencil, Trash2, Download } from "lucide-react"

const UBICACION_LABEL: Record<UbicacionAsistencia, string> = {
  oficina: "Oficina", terreno: "Visita a Terreno", viaje: "Viaje",
}

// Editar/eliminar una marcación es una acción sensible (podría usarse para
// falsear asistencia). Se restringe explícitamente a estas dos personas,
// independiente de quién más tenga rol "admin" a futuro.
const ADMINS_EDICION_ASISTENCIA = ["n.palacios.marchant@gmail.com", "sergioalbornoz@minserco.cl"]

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

interface GeoModalData {
  usuario: string
  tipo: "Entrada" | "Salida"
  hora: string
  lat: number
  lng: number
  precision?: number
  lugar?: string
  fuente?: "gps" | "ip"
}

// Reverse geocoding client-side, gratis y sin API key (BigDataCloud) — solo
// para presentación al administrador, nunca se guarda en el registro.
async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`)
    if (!r.ok) return undefined
    const d = await r.json()
    const partes = [d.locality, d.city, d.principalSubdivision, d.countryName].filter(Boolean)
    return partes.length > 0 ? Array.from(new Set(partes)).join(", ") : undefined
  } catch {
    return undefined
  }
}

const AZUL = "FF1A3673"

async function descargarXlsx(wb: ExcelJS.Workbook, nombre: string) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

export default function AsistenciaAdminPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [lista, setLista] = useState<Asistencia[]>([])
  const [horaIngreso, setHoraIngreso] = useState("08:00")
  const [guardado, setGuardado] = useState(false)
  const [filtroFecha, setFiltroFecha] = useState(hoyISO())
  const [filtroUsuario, setFiltroUsuario] = useState("todos")
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [geoModal, setGeoModal] = useState<GeoModalData | null>(null)
  const [lugarCache, setLugarCache] = useState<Record<string, string>>({})
  const [editando, setEditando] = useState<Asistencia | null>(null)
  const [editHoraEntrada, setEditHoraEntrada] = useState("")
  const [editHoraSalida, setEditHoraSalida] = useState("")
  const [descargando, setDescargando] = useState(false)

  const puedeEditar = !!user?.email && ADMINS_EDICION_ASISTENCIA.includes(user.email)

  useEffect(() => {
    if (user && user.rol !== "admin") { router.push("/"); return }
  }, [user])

  const cargar = () => {
    setLista(asistencias.getAll().slice().reverse())
    setHoraIngreso(asistenciaConfig.get().horaIngreso)
    setNotifs(notificaciones.getAll().filter(n => n.tipo === "asistencia_sin_gps" && !n.leida).slice().reverse())
  }
  useEffect(() => { cargar() }, [])

  function abrirGeo(usuario: string, tipo: "Entrada" | "Salida", hora: string, lat?: number, lng?: number, precision?: number, lugar?: string, fuente?: "gps" | "ip") {
    if (lat == null || lng == null) return
    setGeoModal({ usuario, tipo, hora, lat, lng, precision, lugar, fuente })
    const key = `${lat},${lng}`
    if (!lugar && !lugarCache[key]) {
      reverseGeocode(lat, lng).then(res => {
        if (res) setLugarCache(prev => ({ ...prev, [key]: res }))
      })
    }
  }

  function guardarConfig() {
    asistenciaConfig.set(horaIngreso)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  function abrirEditar(a: Asistencia) {
    if (!puedeEditar) return
    setEditando(a)
    setEditHoraEntrada(a.horaEntrada ?? "")
    setEditHoraSalida(a.horaSalida ?? "")
  }

  function guardarEdicion() {
    if (!editando || !puedeEditar) return
    const tarde = editHoraEntrada ? editHoraEntrada > horaIngreso : false
    asistencias.update(editando.id, {
      horaEntrada: editHoraEntrada,
      horaSalida: editHoraSalida,
      tarde,
    })
    cargar()
    setEditando(null)
  }

  function eliminarRegistro(a: Asistencia) {
    if (!puedeEditar) return
    if (!confirm(`¿Eliminar la marcación de ${a.usuarioNombre} del ${a.fecha}? Esta acción no se puede deshacer.`)) return
    asistencias.delete(a.id)
    cargar()
  }

  const usuariosList = usuarios.getAll()

  const filtrada = lista.filter(a => {
    if (filtroFecha && a.fecha !== filtroFecha) return false
    if (filtroUsuario !== "todos" && a.usuarioId !== filtroUsuario) return false
    return true
  })

  // Resuelve el nombre de lugar de una marca GPS: usa el que ya viene guardado
  // (marcas por IP), o lo busca por reverse-geocoding y lo cachea para no
  // repetir la consulta si varias filas comparten coordenadas.
  async function lugarDe(lat?: number, lng?: number, guardado?: string): Promise<string> {
    if (guardado) return guardado
    if (lat == null || lng == null) return ""
    const key = `${lat},${lng}`
    if (lugarCache[key]) return lugarCache[key]
    const res = await reverseGeocode(lat, lng)
    if (res) setLugarCache(prev => ({ ...prev, [key]: res }))
    return res ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }

  async function descargarVitacora() {
    if (descargando) return
    setDescargando(true)
    try {
      const filas = await Promise.all(
        filtrada.map(async (a, i) => {
          const lugarEntrada = a.horaEntrada ? await lugarDe(a.geoEntradaLat, a.geoEntradaLng, a.geoEntradaLugar) : ""
          const lugarSalida = a.horaSalida ? await lugarDe(a.geoSalidaLat, a.geoSalidaLng, a.geoSalidaLugar) : ""
          return [
            i + 1,
            a.usuarioNombre,
            a.fecha,
            a.horaEntrada ?? "",
            a.horaEntrada ? UBICACION_LABEL[a.ubicacionEntrada!] : "",
            lugarEntrada,
            a.geoEntradaFuente === "ip" ? "Aprox. por IP" : a.geoEntradaFuente === "gps" ? "GPS" : "",
            a.horaSalida ?? "",
            a.horaSalida ? UBICACION_LABEL[a.ubicacionSalida!] : "",
            lugarSalida,
            a.geoSalidaFuente === "ip" ? "Aprox. por IP" : a.geoSalidaFuente === "gps" ? "GPS" : "",
            a.tarde ? "Tarde" : "A tiempo",
          ]
        })
      )

      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet("Vitácora")
      const cols = [
        { h: "N°", w: 5 }, { h: "Trabajador", w: 24 }, { h: "Fecha", w: 12 },
        { h: "Hora entrada", w: 12 }, { h: "Ubicación declarada", w: 16 }, { h: "Lugar de marca (entrada)", w: 30 }, { h: "Fuente (entrada)", w: 13 },
        { h: "Hora salida", w: 12 }, { h: "Ubicación declarada", w: 16 }, { h: "Lugar de marca (salida)", w: 30 }, { h: "Fuente (salida)", w: 13 },
        { h: "Estado", w: 12 },
      ]
      ws.columns = cols.map(c => ({ width: c.w }))

      const rango = filtroFecha
        ? filtroFecha
        : "Todas las fechas"
      const usuarioTitulo = filtroUsuario === "todos" ? "Todo el personal" : usuariosList.find(u => u.id === filtroUsuario)?.nombre ?? "Todo el personal"
      const tRow = ws.addRow([`VITÁCORA DE ASISTENCIA — ${rango} — ${usuarioTitulo}`])
      ws.mergeCells(1, 1, 1, cols.length)
      tRow.getCell(1).font = { bold: true, size: 13, color: { argb: AZUL } }
      tRow.height = 20
      ws.addRow([])

      const hRow = ws.addRow(cols.map(c => c.h))
      hRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } }
        cell.alignment = { vertical: "middle", wrapText: true }
        cell.border = { bottom: { style: "thin", color: { argb: "FFB0B7C3" } } }
      })

      if (filas.length === 0) {
        ws.addRow(["Sin marcaciones para este filtro"])
      } else {
        filas.forEach(f => ws.addRow(f))
      }

      ws.addRow([])
      const rRow = ws.addRow(["RESUMEN"])
      rRow.getCell(1).font = { bold: true, color: { argb: AZUL } }
      const conTardanza = filtrada.filter(a => a.tarde).length
      const sinGps = filtrada.filter(a => a.geoEntradaFuente === "ip" || a.geoSalidaFuente === "ip").length
      ;[
        ["Total registros", filtrada.length],
        ["Tardanzas", conTardanza],
        ["Marcaciones sin GPS (aprox. por IP)", sinGps],
      ].forEach(([k, v]) => {
        const row = ws.addRow([k, v])
        row.getCell(1).font = { bold: true }
      })

      const nombreArchivo = `Vitacora_Asistencia_${filtroFecha || "todas"}${filtroUsuario !== "todos" ? "_" + usuarioTitulo.replace(/\s+/g, "") : ""}.xlsx`
      await descargarXlsx(wb, nombreArchivo)
    } finally {
      setDescargando(false)
    }
  }

  const hoy = hoyISO()
  const registrosHoy = lista.filter(a => a.fecha === hoy)
  const tardanzasHoy = registrosHoy.filter(a => a.tarde).length
  const sinGpsHoy = registrosHoy.filter(a => a.geoEntradaFuente === "ip" || a.geoSalidaFuente === "ip").length

  const stats = [
    { label: "Marcaciones hoy", value: registrosHoy.length },
    { label: "Tardanzas hoy", value: tardanzasHoy, color: tardanzasHoy > 0 ? "#dc2626" : "#059669" },
    { label: "Sin GPS hoy", value: sinGpsHoy, color: sinGpsHoy > 0 ? "#dc2626" : "#059669" },
  ]

  if (user && user.rol !== "admin") return null

  return (
    <PageShell
      icon={Clock}
      title="Reloj de Asistencia"
      subtitle="Configuración de hora de ingreso e historial de marcaciones"
      color="#0369A1"
      stats={stats}
    >
      <div className="space-y-6 max-w-5xl">
        {/* ── Notificaciones: marcaciones sin GPS ── */}
        {notifs.length > 0 && (
          <div className="ds-card p-5" style={{ border: "1px solid #FCA5A540" }}>
            <div className="flex items-center gap-2 mb-3">
              <BellRing size={15} style={{ color: "#dc2626" }} />
              <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>
                Notificaciones · Marcaciones sin GPS ({notifs.length})
              </span>
            </div>
            <div className="space-y-2">
              {notifs.map(n => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-lg"
                  style={{ background: "#FEF2F2" }}
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium" style={{ color: "#991B1B" }}>{n.titulo}</div>
                    {n.mensaje && (
                      <div className="text-[11px] mt-0.5" style={{ color: "#b91c1c" }}>{n.mensaje}</div>
                    )}
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--ds-fg-subtle)" }}>
                      {new Date(n.creadoEn).toLocaleString("es-CL")}
                    </div>
                  </div>
                  <button
                    onClick={() => { notificaciones.marcarLeida(n.id); cargar() }}
                    className="shrink-0 text-[11px] font-medium px-2 py-1 rounded-md"
                    style={{ color: "#991B1B", border: "1px solid #FCA5A5" }}
                  >
                    Marcar leída
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Configuración ── */}
        <div className="ds-card p-5 max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={15} style={{ color: "#0369A1" }} />
            <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>Hora de ingreso</span>
          </div>
          <p className="text-[12px] mb-3" style={{ color: "var(--ds-fg-subtle)" }}>
            El personal que marque su entrada después de esta hora será marcado como tardanza.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={horaIngreso}
              onChange={e => setHoraIngreso(e.target.value)}
              className="h-9 px-3 rounded-lg text-[13px] border"
              style={{ border: "1px solid var(--ds-border)", color: "var(--ds-fg)", background: "var(--ds-surface)", fontFamily: "Fira Code, monospace" }}
            />
            <Button onClick={guardarConfig} style={{ background: guardado ? "#059669" : undefined }}>
              <Save size={13} /> {guardado ? "¡Guardado!" : "Guardar"}
            </Button>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} style={{ color: "var(--ds-fg-subtle)" }} />
            <input
              type="date"
              value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
              className="h-8 px-2 rounded-lg text-[12px] border"
              style={{ border: "1px solid var(--ds-border)", color: "var(--ds-fg)", background: "var(--ds-surface)", fontFamily: "Fira Code, monospace" }}
            />
          </div>
          <button
            onClick={() => setFiltroFecha("")}
            className="text-[11px] underline"
            style={{ color: "var(--ds-fg-subtle)" }}
          >
            Ver todas las fechas
          </button>
          <div className="flex items-center gap-1.5">
            <Users size={13} style={{ color: "var(--ds-fg-subtle)" }} />
            <Select value={filtroUsuario} onValueChange={v => setFiltroUsuario(v ?? "todos")}>
              <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los usuarios</SelectItem>
                {usuariosList.map(u => <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={descargarVitacora}
            disabled={descargando || filtrada.length === 0}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold disabled:opacity-50"
            style={{ background: "#1a3673", color: "#ffffff" }}
          >
            <Download size={13} />
            {descargando ? "Generando..." : "Descargar vitácora (Excel)"}
          </button>
        </div>

        {/* ── Tabla ── */}
        <div className="ds-card overflow-hidden">
          {filtrada.length === 0 ? (
            <div className="empty-state"><Clock size={40} /><p>No hay marcaciones para este filtro.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ds-border)" }}>
                    <th className="text-left py-2.5 px-4 font-medium" style={{ color: "var(--ds-fg-subtle)" }}>Usuario</th>
                    <th className="text-left py-2.5 px-4 font-medium" style={{ color: "var(--ds-fg-subtle)" }}>Fecha</th>
                    <th className="text-left py-2.5 px-4 font-medium" style={{ color: "var(--ds-fg-subtle)" }}>Entrada</th>
                    <th className="text-left py-2.5 px-4 font-medium" style={{ color: "var(--ds-fg-subtle)" }}>Salida</th>
                    <th className="text-left py-2.5 px-4 font-medium" style={{ color: "var(--ds-fg-subtle)" }}>Estado</th>
                    {puedeEditar && (
                      <th className="text-left py-2.5 px-4 font-medium" style={{ color: "var(--ds-fg-subtle)" }}>Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtrada.map(a => (
                    <tr key={a.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <td className="py-2.5 px-4 font-medium" style={{ color: "var(--ds-fg)" }}>{a.usuarioNombre}</td>
                      <td className="py-2.5 px-4" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>{a.fecha}</td>
                      <td className="py-2.5 px-4" style={{ color: "var(--ds-fg-subtle)" }}>
                        {a.horaEntrada ? (
                          <span className="inline-flex items-center gap-1.5">
                            {a.horaEntrada} · {UBICACION_LABEL[a.ubicacionEntrada!]}
                            {a.geoEntradaLat != null && (
                              <button
                                title={a.geoEntradaFuente === "ip" ? "Ubicación aproximada (IP)" : "Ver ubicación GPS"}
                                onClick={() => abrirGeo(a.usuarioNombre, "Entrada", a.horaEntrada!, a.geoEntradaLat, a.geoEntradaLng, a.geoEntradaPrecision, a.geoEntradaLugar, a.geoEntradaFuente)}
                                className="inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0"
                                style={{ background: a.geoEntradaFuente === "ip" ? "#FEE2E2" : "#DBEAFE", color: a.geoEntradaFuente === "ip" ? "#dc2626" : "#0369A1" }}
                              >
                                <MapPin size={11} />
                              </button>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2.5 px-4" style={{ color: "var(--ds-fg-subtle)" }}>
                        {a.horaSalida ? (
                          <span className="inline-flex items-center gap-1.5">
                            {a.horaSalida} · {UBICACION_LABEL[a.ubicacionSalida!]}
                            {a.geoSalidaLat != null && (
                              <button
                                title={a.geoSalidaFuente === "ip" ? "Ubicación aproximada (IP)" : "Ver ubicación GPS"}
                                onClick={() => abrirGeo(a.usuarioNombre, "Salida", a.horaSalida!, a.geoSalidaLat, a.geoSalidaLng, a.geoSalidaPrecision, a.geoSalidaLugar, a.geoSalidaFuente)}
                                className="inline-flex items-center justify-center w-5 h-5 rounded-md shrink-0"
                                style={{ background: a.geoSalidaFuente === "ip" ? "#FEE2E2" : "#DBEAFE", color: a.geoSalidaFuente === "ip" ? "#dc2626" : "#0369A1" }}
                              >
                                <MapPin size={11} />
                              </button>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2.5 px-4">
                        {a.tarde ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FEE2E2", color: "#dc2626" }}>
                            <AlertTriangle size={10} /> Tarde
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#D1FAE5", color: "#059669" }}>
                            <CheckCircle2 size={10} /> A tiempo
                          </span>
                        )}
                      </td>
                      {puedeEditar && (
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              title="Modificar hora"
                              onClick={() => abrirEditar(a)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md"
                              style={{ background: "#DBEAFE", color: "#0369A1" }}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              title="Eliminar marcación"
                              onClick={() => eliminarRegistro(a)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md"
                              style={{ background: "#FEE2E2", color: "#dc2626" }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: ubicación de la marcación (solo administrador) ── */}
      <Dialog open={!!geoModal} onOpenChange={o => !o && setGeoModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin size={15} style={{ color: "#0369A1" }} />
              {geoModal?.usuario} · {geoModal?.tipo} {geoModal?.hora}
            </DialogTitle>
          </DialogHeader>
          {geoModal && (
            <div className="space-y-3">
              <div
                className="rounded-lg overflow-hidden"
                style={{ border: "1px solid var(--ds-border)", height: 260 }}
              >
                <iframe
                  title="Ubicación de la marcación"
                  className="w-full h-full"
                  style={{ border: 0 }}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${geoModal.lng - 0.008}%2C${geoModal.lat - 0.006}%2C${geoModal.lng + 0.008}%2C${geoModal.lat + 0.006}&layer=mapnik&marker=${geoModal.lat}%2C${geoModal.lng}`}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium" style={{ color: "var(--ds-fg)" }}>
                    {geoModal.lugar ?? lugarCache[`${geoModal.lat},${geoModal.lng}`] ?? "Buscando lugar..."}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
                    {geoModal.lat.toFixed(5)}, {geoModal.lng.toFixed(5)}
                  </div>
                </div>
                {geoModal.fuente === "ip" ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FEE2E2", color: "#dc2626" }}>
                    <AlertTriangle size={10} /> Aprox. por IP
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#DBEAFE", color: "#0369A1" }}>
                    <MapPin size={10} /> GPS{geoModal.precision != null ? ` · ±${geoModal.precision}m` : ""}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href={`https://www.google.com/maps?q=${geoModal.lat},${geoModal.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium"
                  style={{ color: "#0369A1" }}
                >
                  <ExternalLink size={12} /> Abrir en Google Maps
                </a>
                <Button onClick={() => setGeoModal(null)} className="h-8 px-3">
                  <X size={13} /> Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: modificar/eliminar hora de una marcación (solo Nicolas/Sergio) ── */}
      <Dialog open={!!editando} onOpenChange={o => !o && setEditando(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={15} style={{ color: "#0369A1" }} />
              {editando?.usuarioNombre} · {editando?.fecha}
            </DialogTitle>
          </DialogHeader>
          {editando && (
            <div className="space-y-3">
              <p className="text-[12px]" style={{ color: "var(--ds-fg-subtle)" }}>
                Deja un campo vacío para eliminar esa marca.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[12px] font-medium" style={{ color: "var(--ds-fg-muted)" }}>Hora entrada</label>
                  <input
                    type="time"
                    value={editHoraEntrada}
                    onChange={e => setEditHoraEntrada(e.target.value)}
                    className="h-9 px-3 rounded-lg text-[13px] border w-full"
                    style={{ border: "1px solid var(--ds-border)", color: "var(--ds-fg)", background: "var(--ds-surface)", fontFamily: "Fira Code, monospace" }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] font-medium" style={{ color: "var(--ds-fg-muted)" }}>Hora salida</label>
                  <input
                    type="time"
                    value={editHoraSalida}
                    onChange={e => setEditHoraSalida(e.target.value)}
                    className="h-9 px-3 rounded-lg text-[13px] border w-full"
                    style={{ border: "1px solid var(--ds-border)", color: "var(--ds-fg)", background: "var(--ds-surface)", fontFamily: "Fira Code, monospace" }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => { setEditando(null); eliminarRegistro(editando) }}
                  className="text-[12px] font-medium inline-flex items-center gap-1"
                  style={{ color: "#dc2626" }}
                >
                  <Trash2 size={12} /> Eliminar marcación completa
                </button>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setEditando(null)} className="h-8 px-3" style={{ background: "var(--ds-surface)", color: "var(--ds-fg)", border: "1px solid var(--ds-border)" }}>
                    Cancelar
                  </Button>
                  <Button onClick={guardarEdicion} className="h-8 px-3">
                    <Save size={13} /> Guardar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
