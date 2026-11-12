# Dependency release review — 23 October 2026

The fresh audit before workspace recovery reported 22 dependency entries: 19 high and 3 moderate, zero critical. These are not 22 independent root vulnerabilities. No forced fix, override, unsupported downgrade or encryption change was applied. Re-run npm audit on the final lock and retain sanitised result before release.

| Root advisory | Current path / decision |
|---|---|
| GHSA-vfj7-8cjw-p6xm | Expo/Metro → micromatch → braces 3.0.3; nested pattern stack exhaustion. Registry latest observed 3.0.3, no patched compatible version established. Keep Metro private and avoid untrusted project patterns; not a remediation. |
| GHSA-86w9-cpqp-85rv | Expo CLI/code-signing certificates → node-forge 1.4.0; RSA signature verification. Latest observed 1.4.0 remains affected. Review native/code-signing reachability and avoid untrusted certificate input; no claim that bundle exposure is absent. |
| GHSA-w5hq-g745-h8pq | Expo config plugins → xcode 3.0.1 → uuid 7.0.3; buffer bounds in v3/v5/v6. Patched major versions exist, latest observed 14.0.3, but forcing an internal major under xcode is unsupported. App IDs use expo-crypto/crypto.randomUUID; build-chain review remains open. |

npm proposed Expo 44.0.6 and React Native 0.72.17 aggregate fixes, incompatible with this Expo 58/SQLCipher baseline; rejected. Resolve through compatible parent-supported releases and native tests. These findings remain a release gate, not waived by passing CI or reduced exposure. No paid security service used.

Primary pages checked: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm ; https://github.com/advisories/GHSA-86w9-cpqp-85rv ; https://github.com/advisories/GHSA-w5hq-g745-h8pq .
