import { uuid } from './session.ts';
export type DeviceRecord = { key: CryptoKey; iv: Uint8Array; sealed: ArrayBuffer; profile: string };
export interface DeviceStore {
  read(scope: string): Promise<DeviceRecord | null>;
  create(scope: string, value: DeviceRecord): Promise<DeviceRecord>;
}
/** Browser protection is origin-bound, not native hardware-backed key storage. */
export async function openAccountDevice(store: DeviceStore, origin: string, user: string, webcrypto: Crypto = globalThis.crypto) {
  if (!uuid(user) || new URL(origin).protocol !== 'https:') throw Error('Verified HTTPS account required.');
  if (!webcrypto?.subtle) throw Error('Secure browser storage requires HTTPS.');
  const scope = origin + ':' + user;
  const aad = new TextEncoder().encode(scope);
  let record = await store.read(scope);
  if (!record) {
    const key = await webcrypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
    const iv = webcrypto.getRandomValues(new Uint8Array(12));
    const secret = Array.from(webcrypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
    const sealed = await webcrypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},key,new TextEncoder().encode(secret));
    record = await store.create(scope,{key,iv,sealed,profile:webcrypto.randomUUID()});
  }
  if (!record.key || record.key.extractable || record.key.algorithm.name !== 'AES-GCM' || !uuid(record.profile))
    throw Error('Account device key is unavailable. Existing local work is preserved.');
  let passphrase: string;
  try { passphrase = new TextDecoder().decode(await webcrypto.subtle.decrypt({name:'AES-GCM',iv:record.iv.slice().buffer,additionalData:aad},record.key,record.sealed)); }
  catch { throw Error('Account device storage could not be unlocked. Existing local work is preserved.'); }
  if (!/^[a-f0-9]{64}$/.test(passphrase)) throw Error('Invalid account device storage. Work is preserved.');
  return {profile:record.profile,passphrase,scope};
}
