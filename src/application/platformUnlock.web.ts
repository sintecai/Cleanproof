import { getBrowserPassphrase } from "../storage/browserDatabase";
export async function unlockPlatform() {
  if (!getBrowserPassphrase())
    throw Error("Reopen this browser workspace with its passphrase.");
  return { success: true };
}
