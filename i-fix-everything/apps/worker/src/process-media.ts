import { createHash } from 'node:crypto';
import { MEDIA_LIMITS, type RejectionReason } from '@ife/contracts';
import { fileTypeFromBuffer } from 'file-type';
import decodeHeic from 'heic-decode';
import sharp, { type Sharp } from 'sharp';

/**
 * Validate an untrusted upload and produce private derivatives.
 *
 * - The real format is detected from the file's bytes, never from the
 *   client-declared type or file name.
 * - Size and decoded pixel count are bounded before full decoding.
 * - Orientation is applied, and every derivative is re-encoded WITHOUT EXIF,
 *   GPS/location or other metadata (sharp drops metadata unless asked to keep it).
 * - No dimensions or measurements are inferred from the photo.
 */
export type DerivativeKind = 'preview' | 'thumb' | 'analysis';

export interface Derivative {
  kind: DerivativeKind;
  buffer: Buffer;
  mime: string;
  ext: string;
  width: number;
  height: number;
}

export type ProcessResult =
  | { ok: true; detectedMime: string; width: number; height: number; sha256: string; bytes: number; derivatives: Derivative[] }
  | { ok: false; reason: RejectionReason };

const ACCEPTED = new Set<string>(MEDIA_LIMITS.acceptedMimeTypes);

/** Long-edge sizes. Analysis size follows the vision provider's recommended maximum (see docs/integrations.md). */
const SIZES: Record<DerivativeKind, number> = { preview: 1600, thumb: 400, analysis: 1568 };

sharp.cache(false);
sharp.concurrency(1);

async function decodeHeicToSharp(buffer: Buffer): Promise<Sharp | RejectionReason> {
  let images: Awaited<ReturnType<typeof decodeHeic.all>> | null = null;
  try {
    images = await decodeHeic.all({ buffer });
    const primary = images[0];
    if (!primary) return 'corrupt_or_unreadable';
    if (primary.width * primary.height > MEDIA_LIMITS.maxPixels) return 'too_many_pixels';
    const { data, width, height } = await primary.decode();
    return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width, height, channels: 4 } });
  } catch {
    return 'corrupt_or_unreadable';
  } finally {
    images?.dispose();
  }
}

export async function processImage(input: Buffer): Promise<ProcessResult> {
  if (input.byteLength === 0) return { ok: false, reason: 'missing_upload' };
  if (input.byteLength > MEDIA_LIMITS.maxBytes) return { ok: false, reason: 'too_large' };

  const type = await fileTypeFromBuffer(input);
  const mime = type?.mime === 'image/heif' || type?.mime === 'image/heic' ? 'image/heic' : type?.mime;
  if (!mime || !ACCEPTED.has(mime)) return { ok: false, reason: 'unsupported_type' };

  let base: Sharp;
  if (mime === 'image/heic') {
    const decoded = await decodeHeicToSharp(input);
    if (typeof decoded === 'string') return { ok: false, reason: decoded as RejectionReason };
    base = decoded;
  } else {
    base = sharp(input, { limitInputPixels: MEDIA_LIMITS.maxPixels, failOn: 'error', animated: false });
  }

  let width: number;
  let height: number;
  try {
    const meta = await base.metadata();
    if (!meta.width || !meta.height) return { ok: false, reason: 'corrupt_or_unreadable' };
    if (meta.width * meta.height > MEDIA_LIMITS.maxPixels) return { ok: false, reason: 'too_many_pixels' };
    // EXIF orientations 5–8 swap the displayed axes.
    const swap = (meta.orientation ?? 1) >= 5;
    width = swap ? meta.height : meta.width;
    height = swap ? meta.width : meta.height;
  } catch (err) {
    return { ok: false, reason: /pixel limit/i.test(String(err)) ? 'too_many_pixels' : 'corrupt_or_unreadable' };
  }

  const derivatives: Derivative[] = [];
  try {
    for (const kind of ['preview', 'thumb', 'analysis'] as const) {
      const pipeline = base
        .clone()
        .rotate() // apply EXIF orientation, then metadata is not copied to the output
        .resize({ width: SIZES[kind], height: SIZES[kind], fit: 'inside', withoutEnlargement: true });
      const out =
        kind === 'analysis'
          ? await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer({ resolveWithObject: true })
          : await pipeline.webp({ quality: kind === 'thumb' ? 70 : 80 }).toBuffer({ resolveWithObject: true });
      derivatives.push({
        kind,
        buffer: out.data,
        mime: kind === 'analysis' ? 'image/jpeg' : 'image/webp',
        ext: kind === 'analysis' ? 'jpg' : 'webp',
        width: out.info.width,
        height: out.info.height,
      });
    }
  } catch (err) {
    return { ok: false, reason: /pixel limit/i.test(String(err)) ? 'too_many_pixels' : 'corrupt_or_unreadable' };
  }

  return {
    ok: true,
    detectedMime: mime,
    width,
    height,
    bytes: input.byteLength,
    sha256: createHash('sha256').update(input).digest('hex'),
    derivatives,
  };
}
