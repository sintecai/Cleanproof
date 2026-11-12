/** Bounded synthetic offline backup envelope. Device keys are never included. */
import {
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
export const digest = (b) => createHash("sha256").update(b).digest("hex");
export function sealBackup(entries, passphrase) {
  if (typeof passphrase !== "string" || passphrase.length < 16)
    throw Error("Backup passphrase must contain at least 16 characters");
  let total = 0;
  const files = Object.entries(entries).map(([name, data]) => {
    if (
      !/^[a-zA-Z0-9_./-]+$/.test(name) ||
      name.startsWith("/") ||
      name.split("/").includes("..")
    )
      throw Error("Unsafe backup name");
    const b = Buffer.from(data);
    total += b.length;
    if (total > 64 * 1024 * 1024)
      throw Error("Synthetic backup limit 64 MiB exceeded");
    return {
      name,
      bytes: b.length,
      sha256: digest(b),
      content: b.toString("base64"),
    };
  });
  const salt = randomBytes(16),
    iv = randomBytes(12),
    key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("CleanProof synthetic backup v1"));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ version: 1, files })),
    cipher.final(),
  ]);
  key.fill(0);
  return Buffer.from(
    JSON.stringify({
      version: 1,
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: encrypted.toString("base64"),
    }),
  );
}
export function openBackup(bytes, passphrase) {
  if (bytes.length > 130 * 1024 * 1024) throw Error("Backup too large");
  const box = JSON.parse(Buffer.from(bytes).toString());
  if (box.version !== 1) throw Error("Unsupported backup");
  const salt = Buffer.from(box.salt, "base64"),
    iv = Buffer.from(box.iv, "base64"),
    tag = Buffer.from(box.tag, "base64");
  if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16)
    throw Error("Invalid envelope");
  const key = scryptSync(passphrase, salt, 32),
    dec = createDecipheriv("aes-256-gcm", key, iv);
  dec.setAAD(Buffer.from("CleanProof synthetic backup v1"));
  dec.setAuthTag(tag);
  let plain;
  try {
    plain = Buffer.concat([
      dec.update(Buffer.from(box.ciphertext, "base64")),
      dec.final(),
    ]);
  } finally {
    key.fill(0);
  }
  const result = JSON.parse(plain);
  if (result.version !== 1 || !Array.isArray(result.files))
    throw Error("Invalid manifest");
  const entries = {};
  let total = 0;
  for (const file of result.files) {
    if (
      !/^[a-zA-Z0-9_./-]+$/.test(file.name) ||
      file.name.startsWith("/") ||
      file.name.split("/").includes("..") ||
      Object.hasOwn(entries, file.name)
    )
      throw Error("Unsafe manifest");
    const data = Buffer.from(file.content, "base64");
    total += data.length;
    if (
      total > 64 * 1024 * 1024 ||
      data.length !== file.bytes ||
      digest(data) !== file.sha256
    )
      throw Error("Backup integrity mismatch");
    entries[file.name] = data;
  }
  return entries;
}
