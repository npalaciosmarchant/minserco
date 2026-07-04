import { getSupabase } from "./supabase"

// Sube cualquier archivo (PDF, imagen, doc, etc.) al bucket "documentos" sin comprimir.
export type ArchivoAdjunto = { url: string; nombre: string }

export async function subirArchivo(file: File): Promise<ArchivoAdjunto> {
  const uuid = (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2)
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin"
  const path = `${uuid}.${ext}`
  const sb = getSupabase()
  const { error } = await sb.storage.from("documentos").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  })
  if (error) throw error
  const { data } = sb.storage.from("documentos").getPublicUrl(path)
  return { url: data.publicUrl, nombre: file.name }
}
