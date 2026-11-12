/** Exact-build, non-destructive Android acceptance handoff. Node 24; no npm dependency. */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export const delivered = Object.freeze({
  package: 'com.sicyinternational.cleanproof.demo',
  sourceCommit: 'a2880dd7b1201fe9b65044069140e32db08411ae',
  sha256: '715a5c7039069f21214f9eaea74adfb7dd385470c6f9f5c2a163c1e2cb405031',
  certificate: 'fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c',
});
export function certificates(output) {
  const found = [...output.matchAll(/^.*certificate SHA-256 digest:\s*([a-f0-9:]+)\s*$/gmi)]
    .map(m => m[1].replaceAll(':', '').toLowerCase());
  if (!found.length || found.some(s => !/^[a-f0-9]{64}$/.test(s))) throw Error('Signing certificate could not be verified. Installation blocked.');
  return [...new Set(found)];
}
export function selectDevice(output, serial) {
  const devices = output.split(/\r?\n/).map(l => l.trim().split(/\s+/)).filter(p => p[1] === 'device');
  const found = serial ? devices.filter(p => p[0] === serial) : devices;
  if (found.length !== 1) throw Error('Connect and authorise exactly one device, or pass --serial. No installation attempted.');
  return found[0][0];
}
export function redact(text) {
  return text.split(/\r?\n/).map(l => /password|token|authorization|cookie|secret|api.?key|access.?key|refresh/i.test(l)
    ? '[sensitive line omitted]'
    : l.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT omitted]')
      .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '[email omitted]')).join('\n');
}
function command(file, args) {
  const r = spawnSync(file, args, { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024, windowsHide: true, shell: false });
  if (r.error) throw Error('Required local tool failed to start or timed out: ' + file);
  return { code: r.status, text: (r.stdout ?? '') + (r.stderr ?? '') };
}
/** Injected runner used by explicit host guard fixtures; CLI always uses real adb/java and fixed identity. */
export function execute(options, runner = command, identity = delivered) {
  const bytes = readFileSync(options.apk);
  if (createHash('sha256').update(bytes).digest('hex') !== identity.sha256) throw Error('APK hash differs from the delivered build. Installation blocked.');
  const invoke = (tool, args, allowFailure = false) => {
    const result = runner(tool, args);
    if (result.code !== 0 && !allowFailure) throw Error('Local command failed; no success recorded: ' + tool + ' ' + args[0]);
    return result;
  };
  const verify = path => certificates(invoke(options.java ?? 'java', ['-jar', options.apksigner, 'verify', '--print-certs', path]).text);
  const incoming = verify(options.apk);
  if (incoming.length !== 1 || incoming[0] !== identity.certificate) throw Error('Incoming signing identity differs. Installation blocked.');
  const adb = options.adb ?? 'adb';
  const serial = selectDevice(invoke(adb, ['devices']).text, options.serial);
  const device = (args, allow = false) => invoke(adb, ['-s', serial, ...args], allow);
  const prop = key => device(['shell', 'getprop', key]).text.trim();
  const abi = prop('ro.product.cpu.abilist').split(',');
  if (!abi.includes('arm64-v8a')) throw Error('Device cannot execute this ARM64-only APK. Installation blocked.');
  const api = Number(prop('ro.build.version.sdk'));
  if (!Number.isInteger(api) || api < 24) throw Error('Device Android API is unsupported. Installation blocked.');
  const evidence = { recordedAt: new Date().toISOString(), apk: identity, device: { alias: 'synthetic-android-test', model: prop('ro.product.model'), android: prop('ro.build.version.release'), api, abi, emulator: prop('ro.kernel.qemu') === '1' }, install: 'Not run', launch: 'Not run', nativeWorkflow: 'Not run: manual observations required', passcodeAndDeviceOwnership: 'Must be confirmed manually; not inferred from adb' };
  const pathResult = device(['shell', 'pm', 'path', identity.package], true);
  options.record?.(evidence);
  const paths = pathResult.text.split(/\r?\n/).filter(l => l.startsWith('package:')).map(l => l.slice(8).trim());
  if (!paths.length) {
    // Retained-data/other-user installs must not be mistaken for a disposable fresh app.
    const retained = device(['shell', 'pm', 'list', 'packages', '-u', identity.package]);
    if (retained.text.includes('package:' + identity.package) || /error|exception|denied/i.test(pathResult.text)) throw Error('An inaccessible or retained installation needs manual review. Installation blocked.');
    evidence.previousInstallation = 'No package reported by pm path/list -u';
  } else {
    const base = paths.find(p => p.endsWith('/base.apk')) ?? (paths.length === 1 ? paths[0] : null);
    if (!base?.startsWith('/') || /[\r\n\0]/.test(base)) throw Error('Installed base APK could not be identified. Installation blocked.');
    const folder = mkdtempSync(join(tmpdir(), 'cleanproof-certificate-'));
    try {
      const local = join(folder, 'installed-base.apk');
      device(['pull', base, local]);
      const installed = verify(local);
      evidence.previousInstallation = { certificateSha256: installed, apkSha256: createHash('sha256').update(readFileSync(local)).digest('hex') };
      options.record?.(evidence);
      if (installed.length !== 1 || installed[0] !== incoming[0]) throw Error('Installed signing identity differs. Upgrade stopped. Preserve app/data; use a separate test device or original authorised signing.');
    } finally { rmSync(folder, { recursive: true, force: true }); } // Only our pulled code copy, never device files/data.
  }
  if (options.install) {
    if (!options.syntheticTestDevice) throw Error('Use --synthetic-test-device only after confirming this is an authorised passcode-protected synthetic test device.');
    const result = device(['install', '-r', resolve(options.apk)], true);
    if (result.code !== 0 || !/^Success\s*$/m.test(result.text)) {
      evidence.install = { status: 'Failed', androidCode: /Failure \[([A-Z0-9_]+)/.exec(result.text)?.[1] ?? 'No installer success acknowledgement' };
      options.record?.(evidence);
      throw Error('Android did not acknowledge successful installation. Preserve existing data.');
    }
    evidence.install = 'Passed: Android package installer returned Success';
    options.record?.(evidence);
  }
  if (options.install) {
    // Package installer acknowledgement is not proof it installed the exact expected bytes.
    const after = device(['shell', 'pm', 'path', identity.package]).text.split(/\r?\n/)
      .filter(l => l.startsWith('package:')).map(l => l.slice(8).trim());
    const base = after.find(p => p.endsWith('/base.apk')) ?? (after.length === 1 ? after[0] : null);
    if (!base?.startsWith('/') || /[\r\n\0]/.test(base)) throw Error('Installed build could not be identified after installation. Launch blocked.');
    const folder = mkdtempSync(join(tmpdir(), 'cleanproof-installed-code-'));
    try {
      const local = join(folder, 'installed-base.apk');
      device(['pull', base, local]);
      const hash = createHash('sha256').update(readFileSync(local)).digest('hex');
      const certs = verify(local);
      evidence.installedBuild = { sha256: hash, certificateSha256: certs };
      options.record?.(evidence);
      if (hash !== identity.sha256 || certs.length !== 1 || certs[0] !== identity.certificate) throw Error('Installed code differs from exact delivered APK. Launch blocked.');
    } finally { rmSync(folder, { recursive: true, force: true }); }
  }
  if (options.launch) {
    if (!options.install && evidence.previousInstallation?.apkSha256 !== identity.sha256) throw Error('Install the verified exact APK before launching; an older signed build is not this acceptance target.');
    if (!options.syntheticTestDevice) throw Error('Explicit --synthetic-test-device confirmation is required before launch.');
    const activity = device(['shell', 'am', 'start', '-W', '-n', identity.package + '/.MainActivity']);
    const pidResult = device(['shell', 'pidof', identity.package], true);
    evidence.launch = { activityManagerStatusOk: /Status:\s*ok/.test(activity.text), processObserved: /^\d+(?:\s+\d+)*$/.test(pidResult.text.trim()), visualStartup: 'Not run: record the actual screen before passing startup' };
    options.record?.(evidence);
    if (options.logs && pidResult.code === 0 && /^\d+$/.test(pidResult.text.trim())) {
      evidence.filteredLog = redact(device(['logcat', '--pid=' + pidResult.text.trim(), '-d', '-t', '200']).text);
      evidence.logPrivacy = 'Heuristic redaction only. Inspect privately before sharing. No all-app/crash buffer collected.';
    }
  }
  return evidence;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2), options = {};
  const values = { '--apk': 'apk', '--apksigner': 'apksigner', '--adb': 'adb', '--java': 'java', '--serial': 'serial', '--out': 'out' };
  try {
    for (let i = 0; i < args.length; i++) {
      if (Object.hasOwn(values, args[i])) { if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error('Missing argument value'); options[values[args[i]]] = args[++i]; }
      else if (['--install', '--launch', '--logs', '--synthetic-test-device'].includes(args[i])) options[{ '--install': 'install', '--launch': 'launch', '--logs': 'logs', '--synthetic-test-device': 'syntheticTestDevice' }[args[i]]] = true;
      else throw Error('Unknown option');
    }
    if (!options.apk || !options.apksigner || !options.out) throw Error('Usage: node scripts/android-device-handoff.mjs --apk APK --apksigner SDK/build-tools/VERSION/lib/apksigner.jar --out NEW_FILE [--install --launch --synthetic-test-device] [--logs]');
    // Fail before touching the device if the evidence path already exists.
    const fd = (await import('node:fs')).openSync(options.out, 'wx', 0o600);
    const fs = await import('node:fs');
    let partial = {};
    const record = value => { partial = value; fs.ftruncateSync(fd, 0); fs.writeSync(fd, JSON.stringify(value, null, 2) + '\n', 0, 'utf8'); };
    options.record = record;
    try {
      const evidence = execute(options);
      record(evidence);
      console.log('Evidence written. Installer/process results are separate from manual native acceptance. Review privately before sharing.');
    } catch (e) {
      record({ ...partial, recordedAt: new Date().toISOString(), status: 'Blocked or failed; no native acceptance pass', reason: redact(e.message) });
      throw e;
    } finally { (await import('node:fs')).closeSync(fd); }
  } catch (e) { console.error(redact(e.message)); process.exitCode = 1; }
}
