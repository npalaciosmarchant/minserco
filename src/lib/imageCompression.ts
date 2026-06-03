import imageCompression from "browser-image-compression"

interface CompressionOptions {
  maxSizeMB?: number
  maxWidthOrHeight?: number
  useWebWorker?: boolean
}

/**
 * Comprimir imagen automáticamente antes de guardarla en Supabase
 * Reduce el tamaño 70-90% sin pérdida visible de calidad
 *
 * @param file - Archivo de imagen (File o Blob)
 * @param options - Opciones de compresión
 * @returns Promise<File> - Archivo comprimido listo para guardar
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const defaultOptions: imageCompression.Options = {
    maxSizeMB: options.maxSizeMB ?? 0.5, // Máximo 500KB por imagen
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1920, // Máximo 1920px de ancho/alto
    useWebWorker: options.useWebWorker ?? true, // Procesa en background thread
  }

  try {
    const compressedBlob = await imageCompression(file, defaultOptions)

    // Convertir Blob a File manteniendo el nombre original
    const fileName = file.name
    const compressedFile = new File([compressedBlob], fileName, {
      type: file.type,
      lastModified: Date.now(),
    })

    // Log de información (opcional, para debug)
    const originalSize = (file.size / 1024 / 1024).toFixed(2)
    const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2)
    const reduction = (
      ((file.size - compressedFile.size) / file.size) *
      100
    ).toFixed(0)

    console.log(
      `📸 Imagen comprimida: ${originalSize}MB → ${compressedSize}MB (reducción: ${reduction}%)`
    )

    return compressedFile
  } catch (error) {
    console.error("Error comprimiendo imagen:", error)
    // Si falla, devolver el archivo original
    return file
  }
}

/**
 * Procesar múltiples imágenes en paralelo
 * @param files - Array de archivos de imagen
 * @param options - Opciones de compresión
 * @returns Promise<File[]> - Array de archivos comprimidos
 */
export async function compressMultipleImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)))
}

/**
 * Calcular cuántas imágenes caben en el almacenamiento disponible
 * @param imageSizeInMB - Tamaño promedio de imagen en MB (después de compresión)
 * @param totalStorageGB - Almacenamiento total disponible en GB
 * @returns número de imágenes que caben
 */
export function calculateImageCapacity(
  imageSizeInMB: number = 0.5,
  totalStorageGB: number = 1
): number {
  const totalStorageMB = totalStorageGB * 1024
  return Math.floor(totalStorageMB / imageSizeInMB)
}
