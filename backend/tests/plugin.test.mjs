import { createRequire } from "node:module";
import assert from "node:assert/strict";
import test from "node:test";
const require = createRequire(import.meta.url);
const { protect } = require("../../plugins/withPrivateDataProtection.cjs");
test("iOS protection plugin fails closed on unsupported hooks and is idempotent", () => {
  const original =
    "import Expo\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)";
  const changed = protect(original, "swift");
  assert.equal(protect(changed, "swift"), changed);
  assert.match(changed, /isExcludedFromBackup = true/);
  assert.match(changed, /FileProtectionType.complete/);
  assert.match(changed, /fatalError/);
  assert.match(changed, /cachesDirectory/);
  assert.throws(
    () => protect("changed launch hook", "swift"),
    /could not locate/,
  );
  assert.throws(() => protect(original, "objcpp"), /supported Swift/);
});
