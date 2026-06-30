"use client"

import { useRef, useState } from "react"
import { Camera, X, ZoomIn, Plus } from "lucide-react"
import { compressImageToBase64 } from "@/lib/imageCompression"

interface FotoGaleriaProps {
  fotos: string[]
  onChange: (fotos: string[]) => void
  maxFotos?: number
  readOnly?: boolean
}

export function FotoGaleria({ fotos = [], onChange, maxFotos = 20, readOnly = false }: FotoGaleriaProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [visor, setVisor] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setCargando(true)
    try {
      const nuevas: string[] = []
      for (const file of files.slice(0, maxFotos - fotos.length)) {
        const base64 = await compressImageToBase64(file)
        nuevas.push(base64)
      }
      onChange([...fotos, ...nuevas])
    } finally {
      setCargando(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  function eliminar(idx: number) {
    onChange(fotos.filter((_, i) => i !== idx))
  }

  if (readOnly && fotos.length === 0) return null

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {fotos.map((foto, idx) => (
          <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shrink-0">
            <img
              src={`data:image/jpeg;base64,${foto}`}
              alt={`Foto ${idx + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setVisor(foto)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setVisor(foto)}
                className="p-1 rounded-lg bg-white/90 hover:bg-white transition-colors"
              >
                <ZoomIn size={12} className="text-gray-700" />
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => eliminar(idx)}
                  className="p-1 rounded-lg bg-white/90 hover:bg-white transition-colors"
                >
                  <X size={12} className="text-red-500" />
                </button>
              )}
            </div>
          </div>
        ))}

        {!readOnly && fotos.length < maxFotos && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={cargando}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-1 shrink-0"
          >
            {cargando ? (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Camera size={16} className="text-gray-400" />
                <span className="text-[10px] text-gray-400 font-medium">Agregar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFile}
        capture="environment"
      />

      {/* Visor pantalla completa */}
      {visor && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setVisor(null)}
        >
          <button
            type="button"
            onClick={() => setVisor(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          <img
            src={`data:image/jpeg;base64,${visor}`}
            alt="Foto ampliada"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
