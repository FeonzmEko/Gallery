import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatExposureTime,
  formatFNumber,
  formatFileSize,
  calculateThumbnailDimensions,
  extractExif,
  processImageFile,
} from '../src/shared/utils/image-processor';

describe('Image Processor & EXIF Extractor (@archive/web/src/shared/utils/image-processor)', () => {
  describe('Helper formatters', () => {
    it('formats exposure time correctly', () => {
      expect(formatExposureTime(0.004)).toBe('1/250s');
      expect(formatExposureTime(0.001)).toBe('1/1000s');
      expect(formatExposureTime(1)).toBe('1s');
      expect(formatExposureTime(2.5)).toBe('2.5s');
      expect(formatExposureTime(0)).toBe('');
      expect(formatExposureTime(undefined)).toBe('');
    });

    it('formats aperture f-number correctly', () => {
      expect(formatFNumber(1.8)).toBe('f/1.8');
      expect(formatFNumber(2.8)).toBe('f/2.8');
      expect(formatFNumber(8)).toBe('f/8');
      expect(formatFNumber(0)).toBe('');
      expect(formatFNumber(undefined)).toBe('');
    });

    it('formats file sizes accurately', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(45 * 1024)).toBe('45.0 KB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });
  });

  describe('calculateThumbnailDimensions', () => {
    it('preserves aspect ratio when scaling down wide images', () => {
      const res = calculateThumbnailDimensions(3840, 2160, 1280, 1280);
      expect(res.width).toBe(1280);
      expect(res.height).toBe(720);
    });

    it('preserves aspect ratio when scaling down tall portrait images', () => {
      const res = calculateThumbnailDimensions(2000, 4000, 1000, 1000);
      expect(res.width).toBe(500);
      expect(res.height).toBe(1000);
    });

    it('does not upscale small images smaller than max dimensions', () => {
      const res = calculateThumbnailDimensions(800, 600, 1280, 1280);
      expect(res.width).toBe(800);
      expect(res.height).toBe(600);
    });

    it('handles zero or negative dimensions safely', () => {
      const res = calculateThumbnailDimensions(0, 0, 1200, 1200);
      expect(res.width).toBe(1200);
      expect(res.height).toBe(1200);
    });
  });

  describe('extractExif', () => {
    it('returns empty object for non-JPEG buffers safely without throwing', () => {
      const buffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]).buffer;
      const exif = extractExif(buffer);
      expect(exif).toEqual({});
    });

    it('returns empty object for truncated buffers', () => {
      const buffer = new Uint8Array([0xff, 0xd8]).buffer;
      const exif = extractExif(buffer);
      expect(exif).toEqual({});
    });

    it('successfully extracts Make, Model, FNumber, ISO from synthetic EXIF APP1 header', () => {
      // Build a minimal valid JPEG with APP1 EXIF segment (Little-Endian 'II')
      const buffer = new ArrayBuffer(256);
      const view = new DataView(buffer);

      // 1. JPEG SOI (0xFFD8)
      view.setUint16(0, 0xffd8);

      // 2. APP1 marker (0xFFE1) and length (200 bytes)
      view.setUint16(2, 0xffe1);
      view.setUint16(4, 200);

      // 3. 'Exif\0\0' (0x45 0x78 0x69 0x66 0x00 0x00)
      view.setUint32(6, 0x45786966);
      view.setUint16(10, 0x0000);

      // 4. TIFF header starts at offset 12
      const tiffStart = 12;
      view.setUint16(tiffStart, 0x4949); // "II" little endian
      view.setUint16(tiffStart + 2, 0x002a, true); // 42
      view.setUint32(tiffStart + 4, 8, true); // IFD0 offset from tiffStart is 8 (offset 20)

      // 5. IFD0 at offset 20: 2 entries (Make, ExifIFD pointer)
      const ifd0Start = tiffStart + 8; // 20
      view.setUint16(ifd0Start, 2, true);

      // Entry 1: Make (0x010F, ASCII, count 5, offset 100 from tiffStart)
      view.setUint16(ifd0Start + 2, 0x010f, true);
      view.setUint16(ifd0Start + 4, 2, true); // ASCII
      view.setUint32(ifd0Start + 6, 5, true); // "SONY\0"
      view.setUint32(ifd0Start + 10, 100, true); // offset to string

      // Write "SONY\0" at tiffStart + 100 (112)
      const makeOffset = tiffStart + 100;
      view.setUint8(makeOffset + 0, 83); // 'S'
      view.setUint8(makeOffset + 1, 79); // 'O'
      view.setUint8(makeOffset + 2, 78); // 'N'
      view.setUint8(makeOffset + 3, 89); // 'Y'
      view.setUint8(makeOffset + 4, 0); // '\0'

      // Entry 2: Exif SubIFD Pointer (0x8769, LONG, count 1, value 50)
      view.setUint16(ifd0Start + 14, 0x8769, true);
      view.setUint16(ifd0Start + 16, 4, true); // LONG
      view.setUint32(ifd0Start + 18, 1, true);
      view.setUint32(ifd0Start + 22, 50, true); // SubIFD offset from tiffStart is 50

      // 6. Exif SubIFD at tiffStart + 50 (offset 62): 2 entries (ISOSpeedRatings, FNumber)
      const subIfdStart = tiffStart + 50;
      view.setUint16(subIfdStart, 2, true);

      // SubEntry 1: ISO (0x8827, SHORT, count 1, value 400)
      view.setUint16(subIfdStart + 2, 0x8827, true);
      view.setUint16(subIfdStart + 4, 3, true); // SHORT
      view.setUint32(subIfdStart + 6, 1, true);
      view.setUint16(subIfdStart + 10, 400, true); // ISO 400

      // SubEntry 2: FNumber (0x829D, RATIONAL, count 1, offset 120 from tiffStart)
      view.setUint16(subIfdStart + 14, 0x829d, true);
      view.setUint16(subIfdStart + 16, 5, true); // RATIONAL
      view.setUint32(subIfdStart + 18, 1, true);
      view.setUint32(subIfdStart + 22, 120, true); // offset to rational

      // Write Rational 28/10 = 2.8 at tiffStart + 120 (132)
      const rationalOffset = tiffStart + 120;
      view.setUint32(rationalOffset, 28, true); // num
      view.setUint32(rationalOffset + 4, 10, true); // den

      const parsed = extractExif(buffer);
      expect(parsed.make).toBe('SONY');
      expect(parsed.iso).toBe(400);
      expect(parsed.fNumber).toBe(2.8);
    });
  });

  describe('processImageFile', () => {
    it('processes image and extracts metadata in headless/fallback environment', async () => {
      const dummyFile = new File([new Uint8Array(2048)], 'test-photo.jpg', {
        type: 'image/jpeg',
      });

      const result = await processImageFile(dummyFile, {
        maxWidth: 800,
        maxHeight: 600,
      });

      expect(result.originalName).toBe('test-photo.jpg');
      expect(result.mimeType).toBe('image/webp');
      expect(result.sizeBytes).toBeLessThanOrEqual(100 * 1024);
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('simulates browser Canvas compression pipeline correctly with mock', async () => {
      // Mock window and document with canvas
      const originalDoc = globalThis.document;
      const originalWin = globalThis.window;
      const originalImage = globalThis.Image;

      try {
        let drawImageCalled = false;
        let toBlobCalled = false;

        const mockCanvas = {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            drawImage: vi.fn(() => {
              drawImageCalled = true;
            }),
          })),
          toBlob: vi.fn((cb: (b: Blob) => void, mime: string, _q: number) => {
            toBlobCalled = true;
            // Return 40KB blob
            cb(new Blob([new Uint8Array(40 * 1024)], { type: mime }));
          }),
          toDataURL: vi.fn(() => 'data:image/webp;base64,mockWebPBase64String'),
        };

        globalThis.document = {
          createElement: vi.fn((tag: string) => {
            if (tag === 'canvas') return mockCanvas;
            return {};
          }),
        } as any;

        globalThis.window = {} as any;

        // Mock Image class
        class MockImage {
          naturalWidth = 2400;
          naturalHeight = 1600;
          width = 2400;
          height = 1600;
          onload: (() => void) | null = null;
          onerror: ((e: any) => void) | null = null;
          set src(_val: string) {
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 10);
          }
        }
        globalThis.Image = MockImage as any;
        globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
        globalThis.URL.revokeObjectURL = vi.fn();

        const file = new File([new Uint8Array(500 * 1024)], 'vacation.jpg', {
          type: 'image/jpeg',
        });

        const res = await processImageFile(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          maxSizeBytes: 100 * 1024,
        });

        expect(drawImageCalled).toBe(true);
        expect(toBlobCalled).toBe(true);
        expect(res.width).toBe(1200);
        expect(res.height).toBe(800); // 2400x1600 scaled to max 1200 is 1200x800
        expect(res.sizeBytes).toBe(40 * 1024);
        expect(res.sizeBytes).toBeLessThan(100 * 1024);
        expect(res.mimeType).toBe('image/webp');
        expect(res.dataUrl).toContain('data:image/webp');
      } finally {
        globalThis.document = originalDoc;
        globalThis.window = originalWin;
        globalThis.Image = originalImage;
      }
    });
  });
});
