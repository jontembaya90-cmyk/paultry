import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * Take or pick a flock photo and keep it in the app's documents folder, so the photo
 * journal survives the system clearing the picker's cache. Small JPEGs keep it low-data.
 */
export async function pickFlockPhoto(source: 'camera' | 'library'): Promise<string | undefined> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return undefined;
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [4, 3] };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled || !res.assets[0]) return undefined;
  const uri = res.assets[0].uri;
  if (process.env.EXPO_OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'flock-photos');
    if (!dir.exists) dir.create();
    const dest = new File(dir, `${Date.now()}.jpg`);
    await new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}
