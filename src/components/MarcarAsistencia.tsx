"use client"

import { useEffect, useRef, useState } from "react"
import { asistencias, asistenciaConfig, notificaciones, fechaHoyLocal } from "@/lib/store"
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

// ── Geolocalización silenciosa (nunca se muestra al usuario que marca) ──────
interface GeoResultado {
  lat?: number
  lng?: number
  precision?: number
  lugar?: string
  fuente?: FuenteGeo
  motivoFallo?: string   // por qué no se pudo usar GPS (se muestra solo al admin)
}

function motivoDeErrorGeo(err: GeolocationPositionError): string {
  // code 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
  if (err.code === 1) return "Permiso de ubicación denegado en el navegador"
  if (err.code === 2) return "Posición no disponible (revisar que la Ubicación esté activada en Windows/macOS, no solo en Chrome)"
  if (err.code === 3) return "Se agotó el tiempo de espera obteniendo el GPS"
  return `Error de geolocalización (código ${err.code}: ${err.message || "desconocido"})`
}

async function obtenerUbicacionPorIP(motivoFallo?: string): Promise<GeoResultado> {
  try {
    const r = await fetch("https://ipapi.co/json/")
    if (!r.ok) throw new Error("ipapi")
    const d = await r.json()
    if (d.latitude == null || d.longitude == null) throw new Error("sin datos")
    const lugar = [d.city, d.region, d.country_name].filter(Boolean).join(", ")
    return { lat: d.latitude, lng: d.longitude, lugar: lugar || undefined, fuente: "ip", motivoFallo }
  } catch {
    try {
      const r = await fetch("https://ipwho.is/")
      const d = await r.json()
      if (!d.success || d.latitude == null) throw new Error("sin datos")
      const lugar = [d.city, d.region, d.country].filter(Boolean).join(", ")
      return { lat: d.latitude, lng: d.longitude, lugar: lugar || undefined, fuente: "ip", motivoFallo }
    } catch {
      return { motivoFallo }
    }
  }
}

function obtenerUbicacion(): Promise<GeoResultado> {
  return new Promise(resolve => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      obtenerUbicacionPorIP("Este navegador no soporta geolocalización").then(resolve)
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        precision: Math.round(pos.coords.accuracy),
        fuente: "gps",
      }),
      err => { obtenerUbicacionPorIP(motivoDeErrorGeo(err)).then(resolve) },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}

type ModoMarca = "entrada" | "salida_colacion" | "entrada_colacion" | "salida"

const MARCA_LABEL: Record<ModoMarca, string> = {
  entrada: "Entrada",
  salida_colacion: "Salida a Colación",
  entrada_colacion: "Regreso de Colación",
  salida: "Salida",
}

function notificarAdminSinGPS(nombre: string, tipoMarca: ModoMarca, lugar?: string, motivoFallo?: string) {
  const partes = [
    motivoFallo ? `Motivo: ${motivoFallo}.` : null,
    lugar ? `Ubicación aproximada por IP: ${lugar}.` : "No fue posible determinar una ubicación aproximada.",
  ].filter(Boolean)
  notificaciones.add({
    tipo: "asistencia_sin_gps",
    titulo: `${nombre} marcó ${MARCA_LABEL[tipoMarca].toLowerCase()} sin permiso de GPS`,
    mensaje: partes.join(" "),
    leida: false,
  })
}

export function MarcarAsistencia() {
  const { user } = useAuth()
  const [registro, setRegistro] = useState<Asistencia | undefined>(undefined)
  const [horaIngreso, setHoraIngreso] = useState("08:00")
  const [open, setOpen] = useState(false)
  const [modo, setModo] = useState<ModoMarca>("entrada")
  const [ubicacion, setUbicacion] = useState<UbicacionAsistencia>("oficina")
  const [aviso, setAviso] = useState<string | null>(null)
  const [hora, setHora] = useState(horaActual())
  const [guardando, setGuardando] = useState(false)
  const geoPendiente = useRef<Promise<GeoResultado> | null>(null)

  const cargar = async () => {
    if (!user) return
    // Muestra de inmediato lo que haya en caché local (puede estar desactualizado)
    // y lo reemplaza apenas responde Supabase, que es la fuente de verdad real.
    setRegistro(asistencias.getHoy(user.id))
    setHoraIngreso(asistenciaConfig.get().horaIngreso)
    const remoto = await asistencias.getHoyRemoto(user.id)
    // null = la consulta falló (p.ej. sin red): se mantiene lo que ya había en
    // caché en vez de borrarlo. undefined = Supabase confirmó que no hay marca.
    if (remoto !== null) setRegistro(remoto)
  }

  useEffect(() => { cargar() }, [user?.id])

  if (!user) return null

  function abrir(m: ModoMarca) {
    setModo(m)
    const ubicacionPrevia = {
      entrada: registro?.ubicacionEntrada,
      salida_colacion: registro?.ubicacionSalidaColacion,
      entrada_colacion: registro?.ubicacionEntradaColacion,
      salida: registro?.ubicacionSalida,
    }[m]
    setUbicacion(ubicacionPrevia ?? "oficina")
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
    // Se reconfirma con el servidor justo antes de guardar (en paralelo con la
    // geolocalización, que igual demora unos segundos): si el diálogo estuvo
    // abierto un rato o hay otra sesión/dispositivo de por medio, evita crear
    // una entrada duplicada en vez de continuar la secuencia del día.
    const [geo, remoto] = await Promise.all([
      geoPendiente.current ?? Promise.resolve({} as GeoResultado),
      asistencias.getHoyRemoto(user.id),
    ])
    const registroActual = remoto !== null ? remoto : registro
    setGuardando(false)

    const geoFields = {
      entrada: {
        geoEntradaLat: geo.lat, geoEntradaLng: geo.lng,
        geoEntradaPrecision: geo.precision, geoEntradaLugar: geo.lugar, geoEntradaFuente: geo.fuente,
      },
      salida_colacion: {
        geoSalidaColacionLat: geo.lat, geoSalidaColacionLng: geo.lng,
        geoSalidaColacionPrecision: geo.precision, geoSalidaColacionLugar: geo.lugar, geoSalidaColacionFuente: geo.fuente,
      },
      entrada_colacion: {
        geoEntradaColacionLat: geo.lat, geoEntradaColacionLng: geo.lng,
        geoEntradaColacionPrecision: geo.precision, geoEntradaColacionLugar: geo.lugar, geoEntradaColacionFuente: geo.fuente,
      },
      salida: {
        geoSalidaLat: geo.lat, geoSalidaLng: geo.lng,
        geoSalidaPrecision: geo.precision, geoSalidaLugar: geo.lugar, geoSalidaFuente: geo.fuente,
      },
    }[modo]

    const tarde = modo === "entrada" ? horaMarcada > horaIngreso : registroActual?.tarde ?? false

    const cambios: Partial<Asistencia> = {
      ...(modo === "entrada" && { horaEntrada: horaMarcada, ubicacionEntrada: ubicacion, tarde }),
      ...(modo === "salida_colacion" && { horaSalidaColacion: horaMarcada, ubicacionSalidaColacion: ubicacion }),
      ...(modo === "entrada_colacion" && { horaEntradaColacion: horaMarcada, ubicacionEntradaColacion: ubicacion }),
      ...(modo === "salida" && { horaSalida: horaMarcada, ubicacionSalida: ubicacion }),
      ...geoFields,
    }

    if (registroActual) {
      asistencias.update(registroActual.id, cambios)
    } else if (modo === "entrada") {
      asistencias.add({
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        fecha: fechaHoyLocal(),
        tarde,
        ...cambios,
      })
    }
    cargar()
    if (geo.fuente === "ip") notificarAdminSinGPS(user.nombre, modo, geo.lugar, geo.motivoFallo)
    if (modo === "entrada" && tarde) {
      setAviso(`Marcaste tu entrada a las ${horaMarcada}, después de las ${horaIngreso} definidas por el administrador.`)
    } else {
      setOpen(false)
    }
  }

  const yaEntrada = !!registro?.horaEntrada
  const yaSalidaColacion = !!registro?.horaSalidaColacion
  const yaEntradaColacion = !!registro?.horaEntradaColacion
  const yaSalida = !!registro?.horaSalida
  const completo = yaEntrada && yaSalidaColacion && yaEntradaColacion && yaSalida

  const siguienteModo: ModoMarca | null = !yaEntrada
    ? "entrada"
    : !yaSalidaColacion
      ? "salida_colacion"
      : !yaEntradaColacion
        ? "entrada_colacion"
        : !yaSalida
          ? "salida"
          : null

  const ICONO_MODO: Record<ModoMarca, typeof LogIn> = {
    entrada: LogIn, salida_colacion: LogOut, entrada_colacion: LogIn, salida: LogOut,
  }

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
              {yaSalidaColacion && <span>· Salida colación {registro!.horaSalidaColacion} · {UBICACION_LABEL[registro!.ubicacionSalidaColacion!]}</span>}
              {yaEntradaColacion && <span>· Regreso colación {registro!.horaEntradaColacion} · {UBICACION_LABEL[registro!.ubicacionEntradaColacion!]}</span>}
              {yaSalida && <span>· Salida {registro!.horaSalida} · {UBICACION_LABEL[registro!.ubicacionSalida!]}</span>}
            </div>
          )}
        </div>
      </div>

      {siguienteModo && (
        <Button onClick={() => abrir(siguienteModo)}>
          {(() => { const Icono = ICONO_MODO[siguienteModo]; return <Icono size={14} /> })()}
          Marcar {MARCA_LABEL[siguienteModo]}
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
            <DialogTitle>Marcar {MARCA_LABEL[modo]}</DialogTitle>
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
                  : `Confirmar ${MARCA_LABEL[modo]}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
