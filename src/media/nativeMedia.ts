import { Directory, File, Paths } from "expo-file-system";
import * as Crypto from "expo-crypto";
import * as Picker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { TransactionalDatabase } from "../storage/contracts.ts";
import { MediaVault } from "./vault.ts";
import type { VaultCrypto, VaultFiles } from "./vault.ts";
const legacyEvidence = new Directory(Paths.document, "cleanproof-evidence-v1");
const transient = new Directory(Paths.cache, "cleanproof-transient-v1");
const safeName = (n: string) => {
  if (!/^[0-9a-f-]+\.(sealed|part)$/.test(n)) throw Error("Invalid asset path");
  return n;
};
export function clearTransient() {
  // These are app-private caches owned by the Expo APIs used by this application.
  for (const n of [
    "cleanproof-transient-v1",
    "ImagePicker",
    "ImageManipulator",
    "Print",
  ]) {
    const d = new Directory(Paths.cache, n);
    if (d.exists) d.delete();
  }
  transient.create({ intermediates: true, idempotent: true });
}
export async function nativeVault(
  db: TransactionalDatabase,
  company: string,
  profile = "legacy",
) {
  const evidence =
    profile === "legacy"
      ? legacyEvidence
      : new Directory(Paths.document, "cleanproof-evidence-" + profile);
  evidence.create({ intermediates: true, idempotent: true });
  clearTransient();
  let keyHex = "";
  await db.transaction(async (tx) => {
    const row = await tx.getFirstAsync<{ value: string }>(
      "SELECT value FROM local_secrets WHERE name=?",
      "media-aes256-v1",
    );
    if (row) keyHex = row.value;
    else {
      const count = await tx.getFirstAsync<{ n: number }>(
        "SELECT COUNT(*) n FROM media_journal",
      );
      if (evidence.list().length || (count?.n ?? 0) > 0)
        throw Error("Existing media has no encryption key; files preserved.");
      keyHex = Array.from(await Crypto.getRandomBytesAsync(32), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      await tx.runAsync(
        "INSERT INTO local_secrets VALUES(?,?)",
        "media-aes256-v1",
        keyHex,
      );
    }
  });
  if (!/^[0-9a-f]{64}$/.test(keyHex)) throw Error("Media key unavailable");
  const key = await Crypto.AESEncryptionKey.import(keyHex, "hex");
  const crypto: VaultCrypto = {
    seal: async (bytes, context) =>
      new Uint8Array(
        await (
          await Crypto.aesEncryptAsync(bytes, key, {
            additionalData: new TextEncoder().encode(context),
            nonce: { length: 12 },
            tagLength: 16,
          })
        ).combined(),
      ),
    open: async (bytes, context) =>
      Crypto.aesDecryptAsync(
        Crypto.AESSealedData.fromCombined(bytes, {
          ivLength: 12,
          tagLength: 16,
        }),
        key,
        { additionalData: new TextEncoder().encode(context) },
      ),
    hash: async (bytes) =>
      Array.from(
        new Uint8Array(
          await Crypto.digest(
            Crypto.CryptoDigestAlgorithm.SHA256,
            bytes.slice().buffer,
          ),
        ),
        (b) => b.toString(16).padStart(2, "0"),
      ).join(""),
  };
  const files: VaultFiles = {
    write: async (n, b) => {
      const f = new File(evidence, safeName(n));
      f.create({ overwrite: false });
      f.write(b);
    },
    read: (n) => new File(evidence, safeName(n)).bytes(),
    move: async (a, b) =>
      new File(evidence, safeName(a)).move(new File(evidence, safeName(b))),
    remove: async (n) => {
      const f = new File(evidence, safeName(n));
      if (f.exists) f.delete();
    },
    exists: (n) => new File(evidence, safeName(n)).exists,
    list: () =>
      evidence
        .list()
        .filter((x) => x instanceof File)
        .map((x) => x.name),
  };
  const vault = new MediaVault(
    db,
    files,
    crypto,
    company,
    () => Crypto.randomUUID(),
    () => new Date().toISOString(),
  );
  const orphans = await vault.reconcile();
  return { vault, orphans };
}
function deleteOwned(uri: string) {
  if (uri.startsWith(Paths.cache.uri)) {
    const f = new File(uri);
    if (f.exists) f.delete();
  }
}
export async function capturePhoto(
  vault: MediaVault,
  inspection: string,
  item: string,
  caption: string,
  camera: boolean,
  actionId: string | null = null,
) {
  transient.create({ intermediates: true, idempotent: true });
  if (camera) {
    const p = await Picker.requestCameraPermissionsAsync();
    if (!p.granted)
      throw Error("Camera permission declined. The inspection remains usable.");
  }
  let source: string | undefined,
    normal: string | undefined,
    owned: string | undefined;
  try {
    const result = camera
      ? await Picker.launchCameraAsync({
          mediaTypes: ["images"],
          exif: false,
          quality: 1,
        })
      : await Picker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsMultipleSelection: false,
          exif: false,
          quality: 1,
        });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset) throw Error("No image returned");
    source = asset.uri;
    if (asset.mimeType && !["image/jpeg", "image/png"].includes(asset.mimeType))
      throw Error("Choose a JPEG or PNG image.");
    if (
      !asset.width ||
      !asset.height ||
      asset.width * asset.height > 50_000_000
    )
      throw Error("Image dimensions are unsupported.");
    const copy = new File(transient, `${Crypto.randomUUID()}.input`);
    new File(source).copy(copy);
    owned = copy.uri;
    const context = ImageManipulator.manipulate(owned);
    context.resize(
      asset.width >= asset.height
        ? { width: Math.min(1600, asset.width) }
        : { height: Math.min(1600, asset.height) },
    );
    const image = await context.renderAsync();
    try {
      const converted = await image.saveAsync({
        format: SaveFormat.JPEG,
        compress: 0.65,
      });
      normal = converted.uri;
      const bytes = await new File(normal).bytes();
      return await vault.add(
        inspection,
        item,
        "photo",
        caption,
        bytes,
        actionId,
      );
    } finally {
      image.release();
      context.release();
    }
  } finally {
    for (const uri of [normal, owned, source]) if (uri) deleteOwned(uri);
  }
}
export async function generateDemoPdf(
  vault: MediaVault,
  inspection: string,
  html: string,
) {
  let uri: string | undefined;
  try {
    const pdf = await Print.printToFileAsync({ html, width: 595, height: 842 });
    uri = pdf.uri;
    return await vault.add(
      inspection,
      null,
      "pdf",
      "Inspection report",
      await new File(uri).bytes(),
    );
  } finally {
    if (uri) deleteOwned(uri);
  }
}
export async function shareDemoPdf(vault: MediaVault, id: string) {
  if (!(await Sharing.isAvailableAsync()))
    throw Error("Native sharing unavailable");
  const f = new File(transient, `CleanProof-report-${id.slice(0,8)}.pdf`);
  try {
    f.create();
    f.write(await vault.read(id));
    await Sharing.shareAsync(f.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Export inspection report",
    });
  } finally {
    if (f.exists) f.delete();
  }
}
