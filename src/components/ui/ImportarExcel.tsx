"use client"

import { useRef, useState } from "react"
import ExcelJS from "exceljs"
import { Upload } from "lucide-react"

type Resultado = { added: number; omitted: number }

type Props = {
  label?: string
  onRows: (rows: Record<string, string>[]) => Promise<Resultado> | Resultado
}

// Normaliza texto: minúsculas y sin tildes, para comparar encabezados de forma robusta.
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}

// Devuelve el valor de la primera columna cuyo encabezado coincida (exacto o por inclusión)
// con alguno de los nombres alternativos entregados.
export function campo(obj: Record<string, string>, ...alts: string[]): string {
  const entries = Object.entries(obj).map(([k, v]) => [norm(k), v] as const)
  for (const alt of alts) {
    const na = norm(alt)
    const exact = entries.find(([k]) => k === na)
    if (exact && exact[1]) return exact[1].trim()
    const partial = entries.find(([k]) => k.includes(na))
    if (partial && partial[1]) return partial[1].trim()
  }
  return ""
}

// Detecta la fila de "descripción/ayuda" que traen los export de 2Workers (segunda fila).
export function pareceDescripcion(obj: Record<string, string>): boolean {
  const txt = norm(Object.values(obj).join(" | "))
  return /del (equipo|cliente|producto|item)\b|generado en 2workers|identificacion personal o comercial|nombre del|codigo del|estatus del producto|planilla de entrega/.test(txt)
}

// Convierte números en formato chileno ("1.234,50", "0,00", "$1.200") a Number.
export function parseNumCL(s: string | undefined | null): number {
  if (s === undefined || s === null) return 0
  let t = String(s).trim().replace(/\$/g, "").replace(/\s/g, "")
  if (t === "" || t === "-") return 0
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".")
  const n = parseFloat(t)
  return isNaN(n) ? 0 : n
}

export function ImportarExcel({ label = "Importar Excel", onRows }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File) {
    setBusy(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buf)
      const ws = wb.worksheets[0]
      if (!ws) { alert("El archivo no tiene hojas de datos."); return }

      const headers: string[] = []
      ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
        headers[col] = cellText(cell.value)
      })

      const rows: Record<string, string>[] = []
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return
        const obj: Record<string, string> = {}
        let hasData = false
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          const h = headers[col]
          if (!h) return
          const s = cellText(cell.value)
          obj[h] = s
          if (s) hasData = true
        })
        if (hasData) rows.push(obj)
      })

      if (rows.length === 0) { alert("No se encontraron filas con datos."); return }

      const { added, omitted } = await onRows(rows)
      alert(`Importación completada.\n\nAgregados: ${added}\nOmitidos (duplicados, vacíos o fila de ayuda): ${omitted}`)
    } catch (e) {
      console.error(e)
      alert("Error al leer el archivo. Asegúrate de que sea un .xlsx válido.")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <>
      <button className="btn-ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
        <Upload size={13} /> {busy ? "Importando…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </>
  )
}

// Extrae texto plano de cualquier tipo de celda de ExcelJS (rich text, hyperlink, fórmula, fecha).
function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v.trim()
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>
    if (typeof o.text === "string") return o.text.trim()
    if (o.richText && Array.isArray(o.richText)) return (o.richText as { text: string }[]).map(t => t.text).join("").trim()
    if (o.result !== undefined) return String(o.result).trim()
    if (o.hyperlink) return String(o.text ?? o.hyperlink).trim()
  }
  return String(v).trim()
}
