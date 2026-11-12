# Dependency review — compatible remediation, 1 November 2026

The compatible locked Expo patches applied on 31 October removed the two high-severity Zod/Expo CLI entries. Expo is 58.0.22, CLI 58.1.18 (its Zod dependency removed), router 58.0.29, SQLite 58.0.15 and dev-client 58.0.18. No forced major override, SDK downgrade or audit suppression was used.

Last completed audit: 0 high, 12 moderate, 0 low, 0 critical. A fresh audit is recorded in evidence/dependency-audit-current.json. Counts are dependency entries, not twelve distinct vulnerabilities. Source/domain code has no direct import of these build glob libraries; build/config pipelines remain exposed to untrusted project inputs and are still in release scope.

| Entry | Remaining impact / action |
|---|---|
| glob | GHSA-3g3m-2fjr-6pw4: cancellation may leave filesystem traversal running; patched 14.0.2. Current Expo chains require older major ranges. Await compatible upstream updates or separately test a major migration; no blind override |
| minimatch | GHSA-g3hv-75wg-m249: attacker-controlled patterns can amplify CPU/memory use; patched 11.0.1. Current transitive ranges are older. Trusted build inputs reduce exposure; compatible upstream fix/native regressions still needed |
| @expo/cli | Moderate inherited glob/config chain. High Zod chain removed; not a blanket clearance |
| @expo/config | Moderate inherited config-plugins/glob chain; update compatibly |
| @expo/config-plugins | Moderate inherited glob chain; inspect native outputs after remediation |
| @expo/fingerprint | Moderate glob/minimatch build traversal chain |
| @expo/inline-modules | Moderate inherited config-plugins chain |
| @expo/local-build-cache-provider | Moderate inherited config chain; only trusted project/cache inputs |
| @expo/metro-config | Moderate inherited config/glob chain |
| @expo/prebuild-config | Moderate inherited config/config-plugins chain |
| expo | Moderate umbrella inherited chain; not evidence of client runtime exploitation or risk acceptance |
| expo-sharing | Moderate inherited native configuration chain; installed OS export still needs acceptance |

Previously identified deepmerge low-severity chain is absent after the earlier compatible update. Remaining findings are not waived or marked resolved. Reproduce with npm ci and npm audit --json; do not use npm audit fix --force. Reviewed primary advisories: https://github.com/advisories/GHSA-3g3m-2fjr-6pw4 and https://github.com/advisories/GHSA-g3hv-75wg-m249 .

## Fresh 2 November verification

Restored npm ci from unchanged root/backend lockfiles. New audit again reports 0 high / 12 moderate / 0 low/critical, saved in evidence/dependency-audit-current.json. npm outdated shows no compatible wanted version for the remaining Expo chain; see evidence/dependency-outdated-current.json. Latest primary advisory pages still identify glob 14.0.2 and minimatch 11.0.1 as patched versions outside these chains. No override or forced audit fix was applied. New application 144-pass/1-skip, backend 34-pass, callback/release 12-pass and web build evidence is separate from unresolved security risk. The optional online Expo compatibility check timed out at proxy; not passed.

Production-migration follow-up: a further fresh audit still reports the same 12 moderate entries and zero high/critical/low. No dependency override or lockfile change occurred. Production SQL/grant completion does not resolve build-library findings.

Function-deployment execution: fresh audit again confirms 12 moderate, zero high/critical/low; fresh npm outdated shows no compatible wanted Expo-chain remediation. Source locks are unchanged. Production CORS hardening and pinned CLI/native images do not waive the remaining glob/minimatch findings. No forced upgrade was applied.

Version 3 review, 2 November: fresh audit remains 12 moderate / 0 high / 0 critical / 0 low. Fresh npm outdated has no wanted Expo package upgrade. No compatible remediation was identified for the glob/minimatch transitive ranges. No locks changed or findings suppressed. Application 149-pass/1-skip, backend 36-pass and configuration 16-pass are regression evidence, not acceptance of these findings. Treat untrusted patterns, repository and cache inputs as build threats pending upstream remediation or a separately approved risk decision.
