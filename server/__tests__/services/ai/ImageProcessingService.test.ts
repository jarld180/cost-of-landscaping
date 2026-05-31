import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockResize = vi.fn().mockReturnThis()
const mockWebp = vi.fn().mockReturnThis()
const mockToBuffer = vi.fn()
const mockMetadata = vi.fn()

vi.mock('sharp', () => {
  return {
    default: vi.fn(() => ({
      resize: mockResize,
      webp: mockWebp,
      toBuffer: mockToBuffer,
      metadata: mockMetadata,
    })),
  }
})

import sharp from 'sharp'
import {
  ImageProcessingService,
  type ProcessedImage,
  type ProcessImageResult,
} from '../../../services/ai/ImageProcessingService'

describe('ImageProcessingService', () => {
  let service: ImageProcessingService

  const fakePngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ])

  const fakeOriginalWebpBuffer = Buffer.alloc(50000)
  const fakeThumbnailWebpBuffer = Buffer.alloc(10000)

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ImageProcessingService()

    mockMetadata.mockResolvedValue({
      width: 1792,
      height: 1024,
      format: 'png',
    })
    mockToBuffer.mockResolvedValue(fakeOriginalWebpBuffer)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('downloadImage', () => {
    it('should download image from URL successfully', async () => {
      const mockUrl = 'https://oaidalleapiprodscus.blob.core.windows.net/test-image.png'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(fakePngBuffer.buffer),
      })

      const result = await service.downloadImage(mockUrl)

      expect(mockFetch).toHaveBeenCalledWith(mockUrl, expect.objectContaining({
        signal: expect.any(AbortSignal),
      }))
      expect(result).toBeInstanceOf(Buffer)
    })

    it('should throw on network error', async () => {
      const mockUrl = 'https://oaidalleapiprodscus.blob.core.windows.net/test-image.png'

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(service.downloadImage(mockUrl)).rejects.toThrow('Network error')
    })

    it('should throw on non-ok response', async () => {
      const mockUrl = 'https://oaidalleapiprodscus.blob.core.windows.net/test-image.png'

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(service.downloadImage(mockUrl)).rejects.toThrow()
    })

    it('should handle download timeout', async () => {
      const mockUrl = 'https://oaidalleapiprodscus.blob.core.windows.net/test-image.png'

      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(service.downloadImage(mockUrl)).rejects.toThrow()
    })
  })

  describe('convertToWebP', () => {
    it('should convert PNG buffer to WebP format', async () => {
      mockToBuffer.mockResolvedValueOnce(fakeOriginalWebpBuffer)

      const result = await service.convertToWebP(fakePngBuffer, { quality: 85 })

      expect(sharp).toHaveBeenCalledWith(fakePngBuffer)
      expect(mockWebp).toHaveBeenCalledWith({ quality: 85 })
      expect(mockToBuffer).toHaveBeenCalled()
      expect(result).toBe(fakeOriginalWebpBuffer)
    })

    it('should apply resize options when provided', async () => {
      mockToBuffer.mockResolvedValueOnce(fakeThumbnailWebpBuffer)

      const result = await service.convertToWebP(fakePngBuffer, {
        width: 510,
        height: 285,
        quality: 80,
        fit: 'cover',
        position: 'center',
      })

      expect(mockResize).toHaveBeenCalledWith(510, 285, {
        fit: 'cover',
        position: 'center',
      })
      expect(mockWebp).toHaveBeenCalledWith({ quality: 80 })
      expect(result).toBe(fakeThumbnailWebpBuffer)
    })

    it('should throw on Sharp conversion error', async () => {
      mockToBuffer.mockRejectedValueOnce(new Error('Sharp processing failed'))

      await expect(service.convertToWebP(fakePngBuffer, { quality: 85 })).rejects.toThrow(
        'Sharp processing failed'
      )
    })
  })

  describe('processImage', () => {
    const mockDalleUrl = 'https://oaidalleapiprodscus.blob.core.windows.net/dalle-image.png'

    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(fakePngBuffer.buffer),
      })

      let callCount = 0
      mockToBuffer.mockImplementation(() => {
        callCount++
        return Promise.resolve(callCount === 1 ? fakeOriginalWebpBuffer : fakeThumbnailWebpBuffer)
      })

      mockMetadata.mockResolvedValue({
        width: 1792,
        height: 1024,
      })
    })

    it('should process image and return success result', async () => {
      const result = await service.processImage(mockDalleUrl)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.pngBuffer).toBeInstanceOf(Buffer)
        expect(result.data.original.buffer).toBe(fakeOriginalWebpBuffer)
        expect(result.data.original.width).toBe(1792)
        expect(result.data.original.height).toBe(1024)
        expect(result.data.thumbnail.buffer).toBe(fakeThumbnailWebpBuffer)
        expect(result.data.thumbnail.width).toBe(510)
        expect(result.data.thumbnail.height).toBe(285)
      }
    })

    it('should generate correct thumbnail dimensions (510x285)', async () => {
      const result = await service.processImage(mockDalleUrl)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.thumbnail.width).toBe(510)
        expect(result.data.thumbnail.height).toBe(285)
      }

      expect(mockResize).toHaveBeenCalledWith(510, 285, {
        fit: 'cover',
        position: 'center',
      })
    })

    it('should return download_failed on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await service.processImage(mockDalleUrl)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.kind).toBe('download_failed')
        expect(result.message).toContain('Network error')
      }
    })

    it('should return timeout on abort error', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await service.processImage(mockDalleUrl)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.kind).toBe('timeout')
        expect(result.message).toContain('timeout')
      }
    })

    it('should return conversion_failed on Sharp error', async () => {
      mockToBuffer.mockRejectedValueOnce(new Error('Sharp processing failed'))

      const result = await service.processImage(mockDalleUrl)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.kind).toBe('conversion_failed')
        expect(result.message).toContain('Sharp processing failed')
      }
    })

    it('should include pngBuffer in result for hash computation', async () => {
      const result = await service.processImage(mockDalleUrl)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.pngBuffer).toBeInstanceOf(Buffer)
        expect(result.data.pngBuffer).not.toBe(result.data.original.buffer)
      }
    })

    it('should use quality 85 for original and 80 for thumbnail', async () => {
      await service.processImage(mockDalleUrl)

      const webpCalls = mockWebp.mock.calls
      expect(webpCalls).toContainEqual([{ quality: 85 }])
      expect(webpCalls).toContainEqual([{ quality: 80 }])
    })
  })

  describe('Type definitions', () => {
    it('should export ProcessedImage type with correct structure', () => {
      const mockProcessedImage: ProcessedImage = {
        original: { buffer: Buffer.alloc(0), width: 1792, height: 1024, size: 50000 },
        thumbnail: { buffer: Buffer.alloc(0), width: 510, height: 285, size: 10000 },
        pngBuffer: Buffer.alloc(0),
      }
      expect(mockProcessedImage.original.width).toBe(1792)
      expect(mockProcessedImage.thumbnail.width).toBe(510)
    })

    it('should export ProcessImageResult union type', () => {
      const successResult: ProcessImageResult = {
        ok: true,
        data: {
          original: { buffer: Buffer.alloc(0), width: 1792, height: 1024, size: 50000 },
          thumbnail: { buffer: Buffer.alloc(0), width: 510, height: 285, size: 10000 },
          pngBuffer: Buffer.alloc(0),
        },
      }
      expect(successResult.ok).toBe(true)

      const downloadFailed: ProcessImageResult = {
        ok: false,
        kind: 'download_failed',
        message: 'Network error',
      }
      expect(downloadFailed.ok).toBe(false)

      const conversionFailed: ProcessImageResult = {
        ok: false,
        kind: 'conversion_failed',
        message: 'Sharp error',
      }
      expect(conversionFailed.kind).toBe('conversion_failed')

      const timeout: ProcessImageResult = {
        ok: false,
        kind: 'timeout',
        message: 'Request timed out',
      }
      expect(timeout.kind).toBe('timeout')
    })
  })
})
