"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { asistencias, asistenciaConfig, usuarios } from "@/lib/store"
import { Asistencia, UbicacionAsistencia } from "@/lib/types"
import PageShell from "@/components/layout/PageShell"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Clock, Save, AlertTriangle, CalendarDays, Users, CheckCircle2 } from "lucide-react"

const UBICACION_LABEL: Record<UbicacionAsistencia, string> = {
  oficina: "Oficina", terreno: "Visita a Terreno", viaje: "Viaje",
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AsistenciaAdminPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [lista, setLista] = useState<Asistencia[]>([])
  const [horaIngreso, setHoraIngreso] = useState("08:00")
  const [guardado, setGuardado] = useState(false)
  const [filtroFecha, setFiltroFecha] = useState(hoyISO())
  const [filtroUsuario, setFiltroUsuario] = useState("todos")

  useEffect(() => {
    if (user && user.rol !== "admin") { router.push("/"); return }
  }, [user])

  const cargar = () => {
    setLista(asistencias.getAll().slice().reverse())
    setHoraIngreso(asistenciaConfig.get().horaIngreso)
  }
  useEffect(() => { cargar() }, [])

  function guardarConfig() {
    asistenciaConfig.set(horaIngreso)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 2000)
  }

  const usuariosList = usuarios.getAll()

  const filtrada = lista.filter(a => {
    if (filtroFecha && a.fecha !== filtroFecha) return false
    if (filtroUsuario !== "todos" && a.usuarioId !== filtroUsuario) return false
    return true
  })

  const hoy = hoyISO()
  const registrosHoy = lista.filter(a => a.fecha === hoy)
  const tardanzasHoy = registrosHoy.filter(a => a.tarde).length

  const stats = [
    { label: "Marcaciones hoy", value: registrosHoy.length },
    { label: "Tardanzas hoy", value: tardanzasHoy, color: tardanzasHoy > 0 ? "#dc2626" : "#059669" },
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
                  </tr>
                </thead>
                <tbody>
                  {filtrada.map(a => (
                    <tr key={a.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                      <td className="py-2.5 px-4 font-medium" style={{ color: "var(--ds-fg)" }}>{a.usuarioNombre}</td>
                      <td className="py-2.5 px-4" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>{a.fecha}</td>
                      <td className="py-2.5 px-4" style={{ color: "var(--ds-fg-subtle)" }}>
                        {a.horaEntrada ? `${a.horaEntrada} · ${UBICACION_LABEL[a.ubicacionEntrada!]}` : "—"}
                      </td>
                      <td className="py-2.5 px-4" style={{ color: "var(--ds-fg-subtle)" }}>
                        {a.horaSalida ? `${a.horaSalida} · ${UBICACION_LABEL[a.ubicacionSalida!]}` : "—"}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
