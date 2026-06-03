import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

export interface PDFOptions {
  titulo: string
  subtitulo?: string
  datos: Record<string, string | number | boolean>
  tablas?: { titulo: string; columnas: string[]; filas: (string | number)[][] }[]
  imagenes?: { url: string; x: number; y: number; width: number; height: number }[]
  logoPNG?: string
  fecha?: boolean
}

export async function generarPDFConImagenes(options: PDFOptions): Promise<string> {
  const doc = new jsPDF()
  let posicionY = 20

  // Logo si existe
  if (options.logoPNG) {
    try {
      doc.addImage(options.logoPNG, "PNG", 20, 10, 30, 20)
      posicionY = 40
    } catch (e) {
      console.warn("No se pudo agregar logo")
    }
  }

  // Título
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(options.titulo, doc.internal.pageSize.getWidth() / 2, posicionY, {
    align: "center",
  })
  posicionY += 10

  // Subtítulo
  if (options.subtitulo) {
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(options.subtitulo, doc.internal.pageSize.getWidth() / 2, posicionY, {
      align: "center",
    })
    posicionY += 8
  }

  // Fecha
  if (options.fecha) {
    doc.setFontSize(10)
    doc.setTextColor(128)
    doc.text(`Generado: ${new Date().toLocaleDateString("es-CL")}`, 20, posicionY)
    posicionY += 8
  }

  posicionY += 5

  // Datos generales
  doc.setFontSize(10)
  doc.setTextColor(0)
  Object.entries(options.datos).forEach(([clave, valor]) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${clave}:`, 20, posicionY)
    doc.setFont("helvetica", "normal")
    doc.text(String(valor), 70, posicionY)
    posicionY += 7
  })

  posicionY += 5

  // Tablas
  if (options.tablas && options.tablas.length > 0) {
    options.tablas.forEach(tabla => {
      if (posicionY > 250) {
        doc.addPage()
        posicionY = 20
      }

      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text(tabla.titulo, 20, posicionY)
      posicionY += 8

      autoTable(doc, {
        head: [tabla.columnas],
        body: tabla.filas,
        startY: posicionY,
        margin: 20,
        didDrawPage: (data: any) => {
          posicionY = data.pageCount > 1 ? 20 : posicionY
        },
      })

      posicionY = (doc as any).lastAutoTable.finalY + 10
    })
  }

  // Imágenes
  if (options.imagenes && options.imagenes.length > 0) {
    for (const img of options.imagenes) {
      try {
        if (img.y + img.height > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage()
        }

        doc.addImage(img.url, "PNG", img.x, img.y, img.width, img.height)
        img.y = (doc as any).lastAutoTable?.finalY || img.y + img.height + 5
      } catch (e) {
        console.warn("Error agregando imagen:", e)
      }
    }
  }

  return doc.output("datauristring")
}
