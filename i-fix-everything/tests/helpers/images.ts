import sharp from 'sharp';

/** Synthetic JPEG carrying EXIF orientation 6 and GPS coordinates (IFD3 = GPS in libvips). */
export async function jpegWithGps(width = 640, height = 480): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 120, g: 90, b: 60 } } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'TestCam', Model: 'Fixture', Orientation: '6' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '37/1 46/1 30/1', GPSLongitudeRef: 'W', GPSLongitude: '122/1 25/1 10/1' },
    })
    .toBuffer();
}

export const pngImage = (w = 300, h = 200) =>
  sharp({ create: { width: w, height: h, channels: 4, background: '#3366cc' } }).png().toBuffer();

export const webpImage = () => sharp({ create: { width: 200, height: 200, channels: 3, background: '#cc6633' } }).webp().toBuffer();

/** Decompression-bomb style: tiny file, enormous pixel count. */
export const hugePixelPng = () =>
  sharp({ create: { width: 10000, height: 6000, channels: 3, background: '#000' } }).png({ compressionLevel: 9 }).toBuffer();

export const notAnImage = () => Buffer.from('This is a text file pretending to be a photo.\n'.repeat(20));

export async function truncatedJpeg(): Promise<Buffer> {
  const full = await sharp({ create: { width: 400, height: 400, channels: 3, background: '#888' } }).jpeg().toBuffer();
  return full.subarray(0, Math.floor(full.length / 3));
}

/** A real SVG (possible script carrier) is rejected even if labeled image/png. */
export const svgImage = () =>
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>');
