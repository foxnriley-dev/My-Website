import { normalizeMime, prevalidate, randomId } from '@ife/api-client';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PreparedPhoto {
  localId: string;
  uri: string;
  mime: string;
  bytes: number;
  problem: string | null;
}

export type PickResult =
  | { status: 'ok'; photos: PreparedPhoto[] }
  | { status: 'cancelled' }
  | { status: 'camera_denied'; canAskAgain: boolean };

const uploadsDir = () => new Directory(Paths.document, 'ife-uploads');

/**
 * Re-encode on device to JPEG: converts HEIC, applies orientation and drops
 * EXIF/GPS before anything leaves the phone. The copy lives in the app's
 * private documents folder so an interrupted upload can resume after restart.
 */
async function prepare(asset: ImagePicker.ImagePickerAsset): Promise<PreparedPhoto> {
  const localId = randomId();
  try {
    const ctx = ImageManipulator.manipulate(asset.uri);
    const longest = Math.max(asset.width ?? 0, asset.height ?? 0);
    if (longest > 4096) ctx.resize((asset.width ?? 0) >= (asset.height ?? 0) ? { width: 4096 } : { height: 4096 });
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
    const dir = uploadsDir();
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = new File(dir, `${localId}.jpg`);
    new File(saved.uri).moveSync(dest);
    const bytes = dest.size ?? 0;
    return { localId, uri: dest.uri, mime: 'image/jpeg', bytes, problem: prevalidate('image/jpeg', bytes) };
  } catch {
    const mime = normalizeMime(asset.mimeType, asset.fileName);
    return { localId, uri: asset.uri, mime, bytes: asset.fileSize ?? 0, problem: 'This photo could not be prepared. Try another photo.' };
  }
}

export async function takePhoto(): Promise<PickResult> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return { status: 'camera_denied', canAskAgain: perm.canAskAgain };
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, exif: false });
  if (res.canceled || !res.assets.length) return { status: 'cancelled' };
  return { status: 'ok', photos: await Promise.all(res.assets.map(prepare)) };
}

/** System photo picker: no broad library permission needed; limited access works as-is. */
export async function choosePhotos(limit: number): Promise<PickResult> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: Math.max(1, limit),
    quality: 1,
    exif: false,
  });
  if (res.canceled || !res.assets.length) return { status: 'cancelled' };
  return { status: 'ok', photos: await Promise.all(res.assets.slice(0, limit).map(prepare)) };
}

export function localFile(uri: string | undefined): File | null {
  if (!uri) return null;
  try {
    const f = new File(uri);
    return f.exists ? f : null;
  } catch {
    return null;
  }
}

export function deleteLocalCopies(): void {
  try {
    const dir = uploadsDir();
    if (dir.exists) dir.delete();
  } catch {
    /* nothing to clean */
  }
}
