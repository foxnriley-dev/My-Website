import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processImage } from '../src/process-media';
import { hugePixelPng, jpegWithGps, notAnImage, pngImage, svgImage, truncatedJpeg, webpImage } from '../../../tests/helpers/images';

const GPS_IFD_POINTER = Buffer.from([0x25, 0x88]); // tag 0x8825, little-endian

describe('processImage (untrusted upload validation)', () => {
  it('accepts JPEG and strips EXIF/GPS from every derivative', async () => {
    const input = await jpegWithGps();
    expect((await sharp(input).metadata()).exif?.includes(GPS_IFD_POINTER)).toBe(true);
    const r = await processImage(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.detectedMime).toBe('image/jpeg');
    expect(r.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(r.derivatives.map((d) => d.kind)).toEqual(['preview', 'thumb', 'analysis']);
    for (const d of r.derivatives) {
      const meta = await sharp(d.buffer).metadata();
      expect(meta.exif).toBeUndefined();
      expect(meta.icc === undefined || meta.icc.length > 0).toBe(true);
    }
    const thumb = r.derivatives.find((d) => d.kind === 'thumb')!;
    expect(Math.max(thumb.width, thumb.height)).toBeLessThanOrEqual(400);
    expect(r.derivatives.find((d) => d.kind === 'analysis')!.mime).toBe('image/jpeg');
  });

  it('applies EXIF orientation to derivatives', async () => {
    const rotated = await sharp({ create: { width: 600, height: 300, channels: 3, background: '#123456' } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(rotated).metadata()).orientation).toBe(6);
    const r = await processImage(rotated);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.width).toBe(300);
    expect(r.height).toBe(600);
    const preview = r.derivatives.find((d) => d.kind === 'preview')!;
    expect(preview.height).toBeGreaterThan(preview.width);
  });

  it('accepts PNG and WebP', async () => {
    expect((await processImage(await pngImage())).ok).toBe(true);
    expect((await processImage(await webpImage())).ok).toBe(true);
  });

  it('detects the real type from bytes, not the declared type', async () => {
    expect(await processImage(notAnImage())).toEqual({ ok: false, reason: 'unsupported_type' });
    expect(await processImage(svgImage())).toEqual({ ok: false, reason: 'unsupported_type' });
  });

  it('rejects decompression bombs by pixel count before decoding', async () => {
    const bomb = await hugePixelPng();
    expect(bomb.byteLength).toBeLessThan(1_000_000);
    expect(await processImage(bomb)).toEqual({ ok: false, reason: 'too_many_pixels' });
  });

  it('rejects truncated or corrupt images', async () => {
    expect(await processImage(await truncatedJpeg())).toEqual({ ok: false, reason: 'corrupt_or_unreadable' });
  });

  it('rejects empty and oversized input', async () => {
    expect(await processImage(Buffer.alloc(0))).toEqual({ ok: false, reason: 'missing_upload' });
    expect(await processImage(Buffer.alloc(16 * 1024 * 1024))).toEqual({ ok: false, reason: 'too_large' });
  });
});
