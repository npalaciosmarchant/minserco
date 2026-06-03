"use client"

import { useState, useRef } from "react"
import { compressImage } from "@/lib/imageCompression"
import { Upload, Loader } from "lucide-react"

/**
 * EJEMPLO de cómo usar compresión de imágenes
 * Copia este código en el componente donde quieras agregar upload de fotos
 */
export function ImageUploadExample() {
  const [compressing, setCompressing] = useState(false)
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [stats, setStats] = useState<{
    original: string
    compressed: string
    reduction: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCompressing(true)
    try {
      const originalSizeMB = (file.size / 1024 / 1024).toFixed(2)

      // Comprimir imagen automáticamente
      const compressed = await compressImage(file, {
        maxSizeMB: 0.5, // 500KB máximo
        maxWidthOrHeight: 1920,
      })

      const compressedSizeMB = (compressed.size / 1024 / 1024).toFixed(2)
      const reduction = (
        ((file.size - compressed.size) / file.size) *
        100
      ).toFixed(0)

      setCompressedFile(compressed)
      setStats({
        original: originalSizeMB,
        compressed: compressedSizeMB,
        reduction,
      })

      // Aquí es donde guardarías en Supabase Storage:
      // await supabase.storage.from('bucket-name').upload('path/filename', compressed)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setCompressing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition"
        onClick={() => fileInputRef.current?.click()}>
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">
          Haz clic para subir foto
        </p>
        <p className="text-xs text-gray-500">
          (Se comprimirá automáticamente)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
      </div>

      {compressing && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <Loader className="w-4 h-4 animate-spin" />
          Comprimiendo imagen...
        </div>
      )}

      {stats && !compressing && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-900 mb-2">
            ✓ Imagen comprimida correctamente
          </p>
          <div className="text-xs text-green-800 space-y-1">
            <p>Tamaño original: <strong>{stats.original} MB</strong></p>
            <p>Tamaño comprimido: <strong>{stats.compressed} MB</strong></p>
            <p>Reducción: <strong>{stats.reduction}%</strong></p>
          </div>
          <p className="text-xs text-green-700 mt-3">
            Archivo listo para guardar en Supabase. Con 1 GB de storage puedes
            guardar ~{Math.floor(1024 / (parseFloat(stats.compressed) || 1))} imágenes.
          </p>
        </div>
      )}
    </div>
  )
}
