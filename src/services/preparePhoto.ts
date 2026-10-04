/**
 * Shrink a phone photo before upload: at most MAX_EDGE px on the long side, JPEG.
 * A 3-5 MB camera photo typically becomes 200-400 KB, which uploads reliably on weak 4G.
 * Never blocks a registration: on any failure (old browser, no canvas, tests) the original is used.
 */

const MAX_EDGE = 1280
const QUALITY = 0.85
/** Already small enough: upload as-is. */
const SKIP_BELOW_BYTES = 450 * 1024

export async function preparePhoto(file: File): Promise<File> {
  if (file.size <= SKIP_BELOW_BYTES) return file
  try {
    const bitmap = await decode(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    // White behind transparent PNGs, so they do not turn black as JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap.source, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified })
  } catch {
    return file
  }
}

interface Decoded {
  source: CanvasImageSource
  width: number
  height: number
  close: () => void
}

/** createImageBitmap honours the photo's EXIF rotation; <img> is the fallback for older browsers. */
async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}
