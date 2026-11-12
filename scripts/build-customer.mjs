import {staticRouteEntries} from './static-route-entries.mjs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function stagingEnvironment(env) {
  if(env.EXPO_PUBLIC_CLEANPROOF_SHOWCASE === "1") throw Error("Synthetic showcase cannot be enabled in a connected customer build.");
  const url = new URL(env.EXPO_PUBLIC_CLEANPROOF_BACKEND_URL || 'about:blank');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.hostname.endsWith('.supabase.co') || url.pathname !== '/')
    throw Error('Set the real HTTPS staging Supabase project origin.');
  const key = env.EXPO_PUBLIC_CLEANPROOF_BACKEND_KEY || '';
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
    throw Error('A public Supabase publishable key is required; secret/service keys are forbidden.');
  return { ...env, EXPO_PUBLIC_CLEANPROOF_DEMO_TOOLS:'0', EXPO_PUBLIC_CLEANPROOF_PREVIEW_LOCAL_ONLY:'0' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = stagingEnvironment(process.env);
  const result = spawnSync(process.execPath, ['node_modules/expo/bin/cli','export','--platform','web','--output-dir','staging-dist'], { env, stdio:'inherit' });
  if (result.error) throw result.error;
  if(result.status===0)staticRouteEntries('staging-dist');
  process.exit(result.status ?? 1);
}
