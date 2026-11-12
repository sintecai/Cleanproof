import * as LocalAuthentication from "expo-local-authentication";
export async function unlockPlatform() {
  return LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock saved cleaning work",
    disableDeviceFallback: false,
  });
}
