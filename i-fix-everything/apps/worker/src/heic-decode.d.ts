declare module 'heic-decode' {
  interface DecodedImage {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }
  interface LazyImage {
    width: number;
    height: number;
    decode(): Promise<DecodedImage>;
  }
  interface Decode {
    (opts: { buffer: Uint8Array | ArrayBuffer }): Promise<DecodedImage>;
    all(opts: { buffer: Uint8Array | ArrayBuffer }): Promise<LazyImage[] & { dispose(): void }>;
  }
  const decode: Decode;
  export default decode;
}
