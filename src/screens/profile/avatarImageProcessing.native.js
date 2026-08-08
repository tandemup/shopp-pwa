// expo-image-manipulator can crop and encode PNG on native platforms, but it
// cannot inspect pixels. The same interface is kept so a native background
// removal module can be added without changing ProfileScreen or the editor.
export async function removeBackgroundAndAddOutline(uri) {
  return uri;
}

