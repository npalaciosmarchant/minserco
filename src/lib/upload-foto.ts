import { getSupabase } from "./supabase"
import { compressImage } from "./imageCompression"

// Comprime la imagen y la sube a Supabase Storage (bucket "fotos").
// Devuelve la URL pública para guardar en el registro (en vez de base64).
export async function subirFoto(file: File): Promise<string> {
  const comprimida = await compressImage(file)
  const tipo = comprimida.type || "image/jpeg"
  const ext = (tipo.split("/")[1] || "jpg").replace("jpeg", "jpg")
  const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2)
  const nombre = `${uuid}.${ext}`

  const sb = getSupabase()
  const { error } = await sb.storage.from("fotos").upload(nombre, comprimida, {
    contentType: tipo,
    upsert: false,
  })
  if (error) throw error

  const { data } = sb.storage.from("fotos").getPublicUrl(nombre)
  return data.publicUrl
}

// Helper: obtiene el src correcto ya sea URL (nuevo) o base64 (registros antiguos)
export function fotoSrc(foto: string): string {
  if (!foto) return ""
  return foto.startsWith("http") || foto.startsWith("data:")
    ? foto
    : `data:image/jpeg;base64,${foto}`
}
