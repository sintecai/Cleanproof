// Dynamic release config is opt-in; old preview/development identity is preserved.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {releaseConfig}=require('./release/config.cjs');
export default ({config})=>releaseConfig(config);
