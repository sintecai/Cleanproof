# 0.7 review

Fresh audit: root 22 affected entries (19 high/3 moderate); backend zero. Pinned react-native-web 0.21.2/sql.js 1.13.0 with third-party notices. Current official unpatched braces/node-forge advisories remain an explicit release gate; no forced downgrade, override or encryption weakening. See VERIFICATION-0.7 and evidence/0.7/npm-audit.json. Android release compilation passed, not native runtime acceptance.

---

# Dependency reassessment — 21 October 2026

Locked baseline installed with npm ci, Node 24.19.0 / npm 11.9. Expo 58.0.16 and React Native 0.88.0 retained. M1 adds SDK-matched expo-image-picker, expo-image-manipulator, expo-print and expo-sharing using Expo's installed offline compatibility matrix. The lockfile pins the actual resolution; no force, legacy-peer-deps, unsupported SDK downgrade or suppression was used.

Fresh baseline npm audit --omit=dev: 26 affected dependency entries, 19 high / 7 moderate. Fresh post-addition audit: **27 entries, 19 high / 8 moderate**. These are dependency entries, not 27 independent root vulnerabilities. The extra config-plugin path comes with expo-sharing. Audit is not clean and remains a real-data/release blocker. The offline Expo version check is weaker than a current remote compatibility service check.

Official advisory pages read on this date:

| Root | Installed path | Current advisory result | Treatment |
| --- | --- | --- | --- |
| braces 3.0.3 | Expo → Metro → metro-file-map → micromatch | <=3.0.3 affected; no patched version listed | Keep trusted build inputs, do not expose Metro publicly; track upstream fix, no false clean claim |
| node-forge 1.4.0 | Expo CLI / code-signing-certificates | <=1.4.0 affected; no patched version listed | No OTA/code-signing service enabled; unresolved build-tool risk remains |
| uuid 7.0.3 | xcode via Expo config-plugins, also sharing plugin | <11.1.1 affected; patched lines include 11.1.1/12.0.1/13.0.1 | Do not override a transitive major version blindly; assess upstream xcode compatibility first |

The uuid advisory concerns v3/v5/v6 caller-provided output buffers. App IDs use expo-crypto.randomUUID (v4), not that API. This does not prove every transitive path unreachable. npm categorises Expo tools under dependencies even with --omit=dev; presence in that report does not by itself prove execution in the native app. No runtime reachability clearance is claimed. Retain the supported SDK set and isolate local synthetic development; before pilot/release resolve findings through supported upstream releases or complete a documented reachability/remediation review and obtain required acceptance. A human security audit has not occurred.

Sources:
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-86w9-cpqp-85rv
- https://github.com/advisories/GHSA-w5hq-g745-h8pq
- https://docs.expo.dev/versions/latest/sdk/crypto/ (native AES-GCM API)
- https://docs.expo.dev/versions/latest/sdk/imagepicker/ (camera/system image selection, Android activity recreation)
- https://docs.expo.dev/versions/latest/sdk/print/ (native rendering and inline-image requirements)

Android picker activity destruction before a local save acknowledgement can leave an uncommitted capture. This spike does not automatically attach a pending picker result to a guessed inspection/item. Reopen the lab and retake/select the synthetic image. Device tests must verify the UX and cache cleanup; production capture recovery should explicitly persist capture intent before extending the guarantee to this pre-acknowledgement case.

## 0.3 reassessment

No mobile dependency was added in the improvement increment. A fresh locked install/audit retains 27 affected entries (19 high, 8 moderate). Official advisory pages above were opened again: braces and node-forge still list no patched release; uuid lists patched major lines but overriding xcode's transitive v7 dependency without compatibility evidence is not a supported fix. No forced fix was applied. Existing tools stay limited to trusted local synthetic development; this is still an unresolved release blocker. External host PDF/DOM QA tools are outside the application dependency tree and are not bundled as app services.


## 0.4 fresh reassessment

Locked npm ci rerun; Expo 58.0.16 / RN 0.88.0 retained. Official advisory pages checked again on 21 October: braces <=3.0.3 and node-forge <=1.4.0 still list no patched versions. Fresh audit remains 27 affected entries (19 high / 8 moderate). No compatible root-package patch was available from the checked registry; no unsupported downgrade/major transitive override or suppression was applied. UUID fix still requires upstream compatibility work. Native AES/SQLCipher were not weakened. Offline `expo install --check` says versions are current but explicitly warns validation is unreliable offline; not a complete compatibility clearance.

No mobile package added; a portable fetch/AbortController adapter calls Supabase Auth/REST. Separate backend/package-lock.json pins development-only @electric-sql/pglite 0.5.10. Its separate audit reports zero findings, which does not clean the mobile tree. Optional formatting/host QA tools are not shipped services/dependencies. Pilot release remains blocked by the unresolved mobile dependency/security review and native acceptance.


## Current 0.5 update — 21 October 2026

0.5 adds no mobile dependency. Backend development tests pin jpeg-js 0.4.4; the exact decoder bytes are vendored for Edge/host use with BSD/Apache notices, avoiding a runtime registry service. Deno type checks pass. Fresh audit retains 27 mobile affected entries (19 high/eight moderate); backend package reports zero. Current official braces/node-forge advisories still have no patched versions. No forced SDK downgrade, transitive major override, suppression or encryption weakening. Native/release security gates remain open.
