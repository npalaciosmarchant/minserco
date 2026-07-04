"use client"

import { useState } from "react"
import { subirArchivo, type ArchivoAdjunto } from "@/lib/upload-archivo"
import { Paperclip, X, FileText, Loader2 } from "lucide-react"

export function ArchivosField({ archivos, onChange }: { archivos: ArchivoAdjunto[]; onChange: (a: ArchivoAdjunto[]) => void }) {
  const [subiendo, setSubiendo] = useState(false)

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return
    setSubiendo(true)
    try {
      const nuevos: ArchivoAdjunto[] = []
      for (const f of Array.from(files)) nuevos.push(await subirArchivo(f))
      onChange([...archivos, ...nuevos])
    } catch (e) {
      alert("No se pudo subir el archivo: " + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="space-y-2">
      {archivos.length > 0 && (
        <div className="space-y-1">
          {archivos.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
              <FileText size={14} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />
              <a href={a.url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline" style={{ color: "var(--foreground)" }}>{a.nombre}</a>
              <button type="button" onClick={() => onChange(archivos.filter((_, j) => j !== i))}><X size={14} className="text-red-400" /></button>
            </div>
          ))}
        </div>
      )}
      <label className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg cursor-pointer" style={{ background: "var(--accent)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
        {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
        {subiendo ? "Subiendo…" : "Adjuntar archivo"}
        <input type="file" multiple className="hidden" disabled={subiendo} onChange={e => onFiles(e.target.files)} />
      </label>
    </div>
  )
}
