import {choosePhotoFile,cancelPhotoPicker} from './photoPicker';
import type { TransactionalDatabase } from "../storage/contracts";
import { browserRecord, browserKeys } from "../storage/browserDatabase";
import { MediaVault } from "./vault";
import { closeReportPreviews } from "../reporting/reportPreview.web";
export function clearTransient() {
  cancelPhotoPicker();
  closeReportPreviews();
}
export async function nativeVault(db: TransactionalDatabase, company: string) {
  const namespace =
      "media-" +
      String((db as { namespace?: string }).namespace ?? "interactive"),
    names = new Set(
      await browserKeys(
        "media-" +
          String((db as { namespace?: string }).namespace ?? "interactive"),
      ),
    );
  let saved = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM local_secrets WHERE name='media-aes256-v1'",
  );
  if (!saved) {
    if (
      names.size ||
      (await db.getFirstAsync("SELECT id FROM media_journal LIMIT 1"))
    )
      throw Error("Attachment key missing; evidence preserved.");
    saved = {
      value: Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
        x.toString(16).padStart(2, "0"),
      ).join(""),
    };
    await db.runAsync(
      "INSERT INTO local_secrets VALUES('media-aes256-v1',?)",
      saved.value,
    );
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(saved.value.match(/../g)!.map((v) => parseInt(v, 16))),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
  const files = {
    write: async (n: string, b: Uint8Array) => {
      if (await browserRecord(namespace, n))
        throw Error("Attachment already exists");
      await browserRecord(namespace, n, b);
      names.add(n);
    },
    read: async (n: string) => {
      const bytes = await browserRecord(namespace, n);
      if (!bytes) throw Error("Attachment unavailable");
      return new Uint8Array(bytes);
    },
    exists: (n: string) => names.has(n),
    move: async (a: string, b: string) => {
      const bytes = await browserRecord(namespace, a);
      if (!bytes) throw Error("Attachment unavailable");
      await browserRecord(namespace, b, bytes);
      await browserRecord(namespace, a, null);
      names.add(b);
      names.delete(a);
    },
    remove: async (n: string) => {
      await browserRecord(namespace, n, null);
      names.delete(n);
    },
    list: () => Array.from(names),
  };
  const vault = new MediaVault(
    db,
    files,
    {
      hash: async (b) =>
        Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", b.slice().buffer),
          ),
          (v) => v.toString(16).padStart(2, "0"),
        ).join(""),
      seal: async (b, aad) => {
        const iv = crypto.getRandomValues(new Uint8Array(12)),
          data = new Uint8Array(
            await crypto.subtle.encrypt(
              {
                name: "AES-GCM",
                iv,
                additionalData: new TextEncoder().encode(aad),
              },
              key,
              b.slice().buffer,
            ),
          );
        const out = new Uint8Array(iv.length + data.length);
        out.set(iv);
        out.set(data, 12);
        return out;
      },
      open: async (b, aad) =>
        new Uint8Array(
          await crypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv: b.slice(0, 12),
              additionalData: new TextEncoder().encode(aad),
            },
            key,
            b.slice(12).buffer,
          ),
        ),
    },
    company,
    () => crypto.randomUUID(),
    () => new Date().toISOString(),
  );
  return { vault, orphans: await vault.reconcile() };
}
export async function capturePhoto(
  vault: MediaVault,
  inspection: string,
  item: string,
  caption: string,
  camera: boolean,
  actionId: string | null = null,
) {
  const file = await choosePhotoFile(camera);
  if (!file) return null;
  if (file.size > 20000000)
    throw Error("Choose a photograph smaller than 20 MB.");
  const image = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1600 / image.width, 1600 / image.height),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    canvas
      .getContext("2d")!
      .drawImage(image, 0, 0, canvas.width, canvas.height);
    let bytes: Uint8Array | undefined;
    for (const quality of [0.8, 0.6, 0.4]) {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (v) => (v ? resolve(v) : reject(Error("Image conversion failed"))),
          "image/jpeg",
          quality,
        ),
      );
      bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.length <= 1000000) break;
    }
    if (!bytes || bytes.length > 1000000)
      throw Error("Photograph remains too large; choose a simpler image.");
    return vault.add(inspection, item, "photo", caption, bytes, actionId);
  } finally {
    image.close();
  }
}
export async function generateDemoPdf(
  _vault: MediaVault,
  _inspection: string,
  _html: string,
): Promise<{ id: string }> {
  throw Error(
    "Use browser report preview/print. Native PDF generation requires the Android/iOS build.",
  );
}
export async function shareDemoPdf(_vault: MediaVault, _id: string) {
  throw Error(
    "Native sharing requires Android/iOS. Browser printing is a local export, not a secure client link.",
  );
}
