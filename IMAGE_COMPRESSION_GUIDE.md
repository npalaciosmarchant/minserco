# 📸 Guía de Compresión Automática de Imágenes

Minserco ahora tiene compresión automática de imágenes para **ahorrar espacio en Supabase Storage** sin perder calidad visual.

## ¿Cuánto espacio ahorras?

| Antes | Después | Reducción |
|-------|---------|-----------|
| 5 MB (foto celular) | 500 KB | 90% |
| 3 MB (captura pantalla) | 300 KB | 90% |
| 2 MB (foto cámara) | 200 KB | 90% |

**Con 1 GB de storage ahora caben ~2,000 imágenes en lugar de 200.**

---

## Cómo usar en tu código

### 1. Import simple

```typescript
import { compressImage } from "@/lib/imageCompression"
```

### 2. Comprimir antes de guardar

```typescript
// Cuando usuario sube una foto:
const file = e.target.files[0]
const compressed = await compressImage(file)

// Guardar en Supabase
const { data, error } = await supabase
  .storage
  .from("fotos-reparaciones")
  .upload(`${reparacionId}/${Date.now()}.jpg`, compressed)
```

### 3. Con múltiples imágenes

```typescript
import { compressMultipleImages } from "@/lib/imageCompression"

const files = Array.from(e.target.files)
const compressed = await compressMultipleImages(files)

// Guardar todas
compressed.forEach(file => {
  supabase.storage.from("fotos").upload(file.name, file)
})
```

---

## Opciones de compresión

```typescript
await compressImage(file, {
  maxSizeMB: 0.5,        // Máximo 500 KB por imagen (default)
  maxWidthOrHeight: 1920, // Máximo ancho/alto 1920px (default)
})
```

### Para diferentes casos:

**Miniaturas rápidas** (0.1-0.2 MB):
```typescript
compressImage(file, { maxSizeMB: 0.2, maxWidthOrHeight: 800 })
```

**Calidad buena** (0.5-1 MB):
```typescript
compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1920 })
```

**Máxima calidad** (1-2 MB):
```typescript
compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2560 })
```

---

## Páginas donde implementar

### ✅ Reparaciones
- Agregar fotos del equipo recibido
- Fotos del diagnóstico
- Fotos del equipo reparado

### ✅ Informes de Entrega
- Foto de entrega del cliente
- Firma digital (si aplica)

### ✅ Fabricación/Instalación
- Fotos del proceso
- Fotos del resultado final

### ✅ Bodega
- Fotos de inventario
- Fotos de repuestos nuevos

---

## Ejemplo completo en un componente

```typescript
"use client"
import { useState } from "react"
import { compressImage } from "@/lib/imageCompression"
import { getSupabase } from "@/lib/supabase"

export function FotoReparacionUpload({ reparacionId }: { reparacionId: string }) {
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // 1. Comprimir
      const compressed = await compressImage(file)

      // 2. Guardar en Supabase
      const supabase = getSupabase()
      const fileName = `${reparacionId}/${Date.now()}.jpg`
      
      const { data, error } = await supabase
        .storage
        .from("reparaciones")
        .upload(fileName, compressed)

      if (error) throw error

      // 3. Obtener URL pública
      const { data: publicData } = supabase
        .storage
        .from("reparaciones")
        .getPublicUrl(fileName)

      setUrl(publicData.publicUrl)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {url && <img src={url} alt="Reparación" />}
    </div>
  )
}
```

---

## Monitoreo de espacio

```typescript
import { calculateImageCapacity } from "@/lib/imageCompression"

// ¿Cuántas imágenes caben?
const capacity = calculateImageCapacity(0.5, 1) // 0.5MB por imagen, 1GB total
console.log(`Caben ${capacity} imágenes`) // → Caben 2048 imágenes
```

---

## Notas técnicas

- ✅ Funciona en navegador (no requiere servidor)
- ✅ Sin pérdida de calidad perceptible
- ✅ Procesa en background worker (no bloquea UI)
- ✅ Soporta JPG, PNG, WebP
- ✅ Si la compresión falla, usa la imagen original

---

## Antes vs Después

Sin compresión (plan Free):
- 500 MB límite de base de datos
- ~200 fotos máximo
- Se llena en 1-2 meses

Con compresión (plan Free):
- 500 MB límite de base de datos
- ~2,000 fotos máximo
- Se llena en 1-2 años

---

## ¿Preguntas?

Si necesitas cambiar opciones de compresión para un caso específico, revisa `src/lib/imageCompression.ts`.
