function loadImage(uri) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = uri;
  });
}

export async function removeBackgroundAndAddOutline(uri, outlineWidth = 3) {
  const image = await loadImage(uri);
  const size = Math.min(image.naturalWidth || image.width, 128);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, size, size);

  const pixels = context.getImageData(0, 0, size, size);
  const data = pixels.data;
  const sample = (x, y) => {
    const index = (y * size + x) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  };
  const corners = [sample(0, 0), sample(size - 1, 0), sample(0, size - 1), sample(size - 1, size - 1)];
  const background = corners.reduce((sum, color) => sum.map((v, i) => v + color[i]), [0, 0, 0]).map((v) => v / corners.length);
  const distance = (index) => Math.sqrt(
    (data[index] - background[0]) ** 2 +
    (data[index + 1] - background[1]) ** 2 +
    (data[index + 2] - background[2]) ** 2,
  );

  // Remove pixels close to the colour found at the four corners.
  for (let index = 0; index < data.length; index += 4) {
    if (distance(index) < 58) data[index + 3] = 0;
  }
  context.putImageData(pixels, 0, 0);

  // Draw a white outline around the remaining subject.
  const subject = context.getImageData(0, 0, size, size);
  const outline = Math.max(0, Math.min(10, Math.round(outlineWidth)));
  if (outline > 0) {
    const copy = new Uint8ClampedArray(subject.data);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const index = (y * size + x) * 4;
        if (copy[index + 3] !== 0) continue;
        let found = false;
        for (let oy = -outline; oy <= outline && !found; oy += 1) {
          for (let ox = -outline; ox <= outline; ox += 1) {
            const nx = x + ox;
            const ny = y + oy;
            if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
            if (copy[(ny * size + nx) * 4 + 3] > 0) { found = true; break; }
          }
        }
        if (found) {
          subject.data[index] = 255;
          subject.data[index + 1] = 255;
          subject.data[index + 2] = 255;
          subject.data[index + 3] = 255;
        }
      }
    }
    context.putImageData(subject, 0, 0);
  }
  return canvas.toDataURL("image/png");
}

