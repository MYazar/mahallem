const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_EDGE = 1000

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Dosya okunamadı.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Fotoğraf açılamadı.'))
    img.src = src
  })
}

/** Fotoğrafı yüklemeden önce tarayıcıda küçültüp JPEG'e çevirir. */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Lütfen bir fotoğraf seçin.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Fotoğraf 2 MB’dan büyük olamaz.')
  }

  const dataUrl = await readFile(file)
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Fotoğraf işlenemedi.')

  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.72)
}
