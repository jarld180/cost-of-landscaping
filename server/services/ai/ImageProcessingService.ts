import sharp from 'sharp'

export interface ProcessedImage {
  original: { buffer: Buffer; width: number; height: number; size: number }
  thumbnail: { buffer: Buffer; width: number; height: number; size: number }
  pngBuffer: Buffer
}

export type ProcessImageResult =
  | { ok: true; data: ProcessedImage }
  | { ok: false; kind: 'download_failed' | 'conversion_failed' | 'timeout'; message: string }

interface ConvertOptions {
  width?: number
  height?: number
  quality: number
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  position?: 'center' | 'top' | 'right' | 'bottom' | 'left'
}

const DOWNLOAD_TIMEOUT_MS = 30000
const ORIGINAL_QUALITY = 85
const THUMBNAIL_QUALITY = 80
const THUMBNAIL_WIDTH = 510
const THUMBNAIL_HEIGHT = 285

export class ImageProcessingService {
  async downloadImage(url: string): Promise<Buffer> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS)

    try {
      const response = await fetch(url, { signal: controller.signal })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async convertToWebP(buffer: Buffer, options: ConvertOptions): Promise<Buffer> {
    let pipeline = sharp(buffer)

    if (options.width && options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.fit,
        position: options.position,
      })
    }

    return pipeline.webp({ quality: options.quality }).toBuffer()
  }

  async processImage(dalleUrl: string): Promise<ProcessImageResult> {
    let pngBuffer: Buffer

    try {
      pngBuffer = await this.downloadImage(dalleUrl)
    } catch (error) {
      const err = error as Error
      if (err.name === 'AbortError') {
        return { ok: false, kind: 'timeout', message: 'Download timeout exceeded' }
      }
      return { ok: false, kind: 'download_failed', message: err.message }
    }

    try {
      const metadata = await sharp(pngBuffer).metadata()
      const originalWidth = metadata.width ?? 1792
      const originalHeight = metadata.height ?? 1024

      const originalBuffer = await this.convertToWebP(pngBuffer, { quality: ORIGINAL_QUALITY })

      const thumbnailBuffer = await this.convertToWebP(pngBuffer, {
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        quality: THUMBNAIL_QUALITY,
        fit: 'cover',
        position: 'center',
      })

      return {
        ok: true,
        data: {
          original: {
            buffer: originalBuffer,
            width: originalWidth,
            height: originalHeight,
            size: originalBuffer.length,
          },
          thumbnail: {
            buffer: thumbnailBuffer,
            width: THUMBNAIL_WIDTH,
            height: THUMBNAIL_HEIGHT,
            size: thumbnailBuffer.length,
          },
          pngBuffer,
        },
      }
    } catch (error) {
      const err = error as Error
      return { ok: false, kind: 'conversion_failed', message: err.message }
    }
  }
}
