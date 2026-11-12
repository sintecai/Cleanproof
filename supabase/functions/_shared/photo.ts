export function validatePhoto(b: Uint8Array) {
  if (
    b.length < 12 ||
    b.length > 1000000 ||
    b[0] !== 255 ||
    b[1] !== 216 ||
    b.at(-2) !== 255 ||
    b.at(-1) !== 217
  )
    throw Error("Invalid JPEG size/signature.");
  let p = 2,
    frame = false,
    scan = false;
  while (p < b.length - 2) {
    if (b[p++] !== 255) throw Error("Invalid marker.");
    while (b[p] === 255) p++;
    const m = b[p++]!;
    if (m === 218) {
      scan = true;
      break;
    }
    if (m === 217) break;
    if (m === 1 || (m >= 208 && m <= 216)) continue;
    const length = (b[p]! << 8) | b[p + 1]!;
    if (length < 2 || p + length > b.length) throw Error("Truncated JPEG.");
    if (m === 225) throw Error("EXIF metadata is not allowed.");
    if ([192, 193, 194].includes(m)) {
      const h = (b[p + 3]! << 8) | b[p + 4]!,
        w = (b[p + 5]! << 8) | b[p + 6]!;
      if (length < 8 || w < 1 || h < 1 || w > 1600 || h > 1600)
        throw Error("Invalid dimensions.");
      frame = true;
    }
    p += length;
  }
  if (!frame || !scan) throw Error("JPEG frame/scan missing.");
}
