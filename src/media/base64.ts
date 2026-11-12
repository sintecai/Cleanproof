const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export function base64(bytes: Uint8Array) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!,
      b = bytes[i + 1],
      c = bytes[i + 2];
    out +=
      chars[a >> 2]! +
      chars[((a & 3) << 4) | ((b ?? 0) >> 4)]! +
      (b === undefined ? "=" : chars[((b & 15) << 2) | ((c ?? 0) >> 6)]!) +
      (c === undefined ? "=" : chars[c & 63]!);
  }
  return out;
}
