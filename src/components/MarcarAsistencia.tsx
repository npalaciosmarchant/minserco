"use client"

import { useEffect, useRef, useState } from "react"
import { asistencias, asistenciaConfig, notificaciones } from "@/lib/store"
import { Asistencia, FuenteGeo, UbicacionAsistencia } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, LogIn, LogOut, MapPin, AlertTriangle, CheckCircle2 } from "lucide-react"

const UBICACIONES: { value: UbicacionAsistencia; label: string }[] = [
  { value: "oficina", label: "Oficina" },
  { value: "terreno", label: "Visita a Terreno" },
  { value: "viaje",   label: "Viaje" },
]

const UBICACION_LABEL: Record<UbicacionAsistencia, string> = {
  oficina: "Oficina", terreno: "Visita a Terreno", viaje: "Viaje",
}

function horaActual() {
  return new Date().toTimeString().slice(0, 5)
}
function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── Geolocalización silenciosa (nunca se muestra al usuario que marca) ──────
interface GeoResultado {
  lat?: number
  lng?: number
  precision?: number
  lugar?: string
  fuente?: FuenteGeo
}

async function obtenerUbicacionPorIP(): Promise<GeoResultado> {
  try {
    const r = await fetch("https://ipapi.co/json/")
    if (!r.ok) throw new Error("ipapi")
    const d = await r.json()
    if (d.latitude == null || d.longitude == null) throw new Error("sin datos")
    const lugar = [d.city, d.region, d.country_name].filter(Boolean).join(", ")
    return { lat: d.latitude, lng: d.longitude, lugar: lugar || undefined, fuente: "ip" }
  } catch {
    try {
      const r = await fetch("https://ipwho.is/")
      const d = await r.json()
      if (!d.success || d.latitude == null) throw new Error("sin datos")
      const lugar = [d.city, d.region, d.country].filter(Boolean).join(", ")
      return { lat: d.latitude, lng: d.longitude, lugar: lugar || undefined, fuente: "ip" }
    } catch {
      return {}
    }
  }
}

function obtenerUbicacion(): Promise<GeoResultado> {
  return new Promise(resolve => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      obtenerUbicacionPorIP().then(resolve)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        precision: Math.round(pos.coords.accuracy),
        fuente: "gps",
      }),
      () => { obtenerUbicacionPorIP().then(resolve) },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  })
}

function notificarAdminSinGPS(nombre: string, tipoMarca: "entrada" | "salida", lugar?: string) {
  notificaciones.add({
    tipo: "asistencia_sin_gps",
    titulo: `${nombre} marcó ${tipoMarca === "entrada" ? "entrada" : "salida"} sin permiso de GPS`,
    mensaje: lugar
      ? `Ubicación aproximada por IP: ${lugar}`
      : "No fue posible determinar una ubicación aproximada.",
    leida: false,
  })
}

export function MarcarAsistencia() {
  const { user } = useAuth()
  const [registro, setRegistro] = useState<Asistencia | undefined>(undefined)
  const [horaIngreso, setHoraIngreso] = useState("08:00")
  const [open, setOpen] = useState(false)
  const [modo, setModo] = useState<"entrada" | "salida">("entrada")
  const [ubicacion, setUbicacion] = useState<UbicacionAsistencia>("oficina")
  const [aviso, setAviso] = useState<string | null>(null)
  const [hora, setHora] = useState(horaActual())
  const [guardando, setGuardando] = useState(false)
  const geoPendiente = useRef<Promise<GeoResultado> | null>(null)

  const cargar = () => {
    if (!user) return
    setRegistro(asistencias.getHoy(user.id))
    setHoraIngreso(asistenciaConfig.get().horaIngreso)
  }

  useEffect(() => { cargar() }, [user?.id])

  if (!user) return null

  function abrir(m: "entrada" | "salida") {
    setModo(m)
    setUbicacion((m === "entrada" ? registro?.ubicacionEntrada : registro?.ubicacionSalida) ?? "oficina")
    setAviso(null)
    setHora(horaActual())
    // Se solicita/obtiene la ubicación apenas se abre el diálogo (con gesto del
    // usuario ya presente) para que esté lista cuando confirme. Nunca se muestra
    // en esta pantalla: solo queda disponible para el administrador.
    geoPendiente.current = obtenerUbicacion()
    setOpen(true)
  }

  async function confirmar() {
    if (!user) return
    setGuardando(true)
    const horaMarcada = horaActual()
    const geo = (await geoPendiente.current) ?? {}
    setGuardando(false)

    const geoFields = modo === "entrada"
      ? {
          geoEntradaLat: geo.lat,
          geoEntradaLng: geo.lng,
          geoEntradaPrecision: geo.precision,
          geoEntradaLugar: geo.lugar,
          geoEntradaFuente: geo.fuente,
        }
      : {
          geoSalidaLat: geo.lat,
          geoSalidaLng: geo.lng,
          geoSalidaPrecision: geo.precision,
          geoSalidaLugar: geo.lugar,
          geoSalidaFuente: geo.fuente,
        }

    if (modo === "entrada") {
      const tarde = horaMarcada > horaIngreso
      if (registro) {
        asistencias.update(registro.id, { horaEntrada: horaMarcada, ubicacionEntrada: ubicacion, tarde, ...geoFields })
      } else {
        asistencias.add({
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          fecha: hoyISO(),
          horaEntrada: horaMarcada,
          ubicacionEntrada: ubicacion,
          tarde,
          ...geoFields,
        })
      }
      cargar()
      if (geo.fuente === "ip") notificarAdminSinGPS(user.nombre, "entrada", geo.lugar)
      if (tarde) {
        setAviso(`Marcaste tu entrada a las ${horaMarcada}, después de las ${horaIngreso} definidas por el administrador.`)
      } else {
        setOpen(false)
      }
    } else {
      if (registro) asistencias.update(registro.id, { horaSalida: horaMarcada, ubicacionSalida: ubicacion, ...geoFields })
      cargar()
      if (geo.fuente === "ip") notificarAdminSinGPS(user.nombre, "salida", geo.lugar)
      setOpen(false)
    }
  }

  const yaEntrada = !!registro?.horaEntrada
  const yaSalida = !!registro?.horaSalida
  const completo = yaEntrada && yaSalida

  return (
    <div
      className="ds-card p-5 flex items-center justify-between gap-4 flex-wrap"
      style={{ border: registro?.tarde ? "1px solid #FCA5A540" : undefined }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: completo ? "#D1FAE5" : yaEntrada ? "#DBEAFE" : "#FEF3C7" }}
        >
          {completo
            ? <CheckCircle2 size={20} style={{ color: "var(--ds-success)" }} />
            : <Clock size={20} style={{ color: yaEntrada ? "#0369A1" : "var(--ds-warning)" }} />}
        </div>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>
            Reloj de asistencia de hoy
          </div>
          {!yaEntrada && (
            <div className="text-[12px] mt-0.5" style={{ color: "var(--ds-fg-subtle)" }}>
              Aún no marcas tu entrada
            </div>
          )}
          {yaEntrada && (
            <div className="text-[12px] mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--ds-fg-subtle)" }}>
              <span>Entrada {registro!.horaEntrada} · {UBICACION_LABEL[registro!.ubicacionEntrada!]}</span>
              {registro?.tarde && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ background: "#FEE2E2", color: "#dc2626" }}>
                  <AlertTriangle size={10} /> Tarde
                </span>
              )}
              {yaSalida && <span>· Salida {registro!.horaSalida} · {UBICACION_LABEL[registro!.ubicacionSalida!]}</span>}
            </div>
          )}
        </div>
      </div>

      {!completo && (
        <Button onClick={() => abrir(yaEntrada ? "salida" : "entrada")}>
          {yaEntrada ? <LogOut size={14} /> : <LogIn size={14} />}
          {yaEntrada ? "Marcar Salida" : "Marcar Entrada"}
        </Button>
      )}
      {completo && (
        <span className="text-[12px] font-medium" style={{ color: "var(--ds-success)" }}>
          Registro completo del día
        </span>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{modo === "entrada" ? "Marcar Entrada" : "Marcar Salida"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center py-2">
              <div className="text-3xl font-bold" style={{ fontFamily: "Fira Code, monospace", color: "var(--ds-fg)" }}>
                {hora}
              </div>
              <div className="text-[12px] mt-1 capitalize" style={{ color: "var(--ds-fg-subtle)" }}>
                {new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>

            {!aviso && (
              <div className="space-y-1">
                <label className="text-[12px] font-medium flex items-center gap-1.5" style={{ color: "var(--ds-fg-muted)" }}>
                  <MapPin size={12} /> ¿Dónde te encuentras?
                </label>
                <Select value={ubicacion} onValueChange={v => v && setUbicacion(v as UbicacionAsistencia)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UBICACIONES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {aviso && (
              <div className="flex items-start gap-2 p-3 rounded-lg text-[12px]" style={{ background: "#FEF2F2", color: "#991B1B" }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{aviso}</span>
              </div>
            )}

            <Button className="w-full" disabled={guardando} onClick={aviso ? () => setOpen(false) : confirmar}>
              {aviso
                ? "Entendido"
                : guardando
                  ? "Guardando..."
                  : (modo === "entrada" ? "Confirmar Entrada" : "Confirmar Salida")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
