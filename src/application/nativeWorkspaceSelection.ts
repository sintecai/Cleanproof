import {uuid} from '../auth/session.ts';
export type WorkspaceIdentity={user_id:string;company:string;origin:string};
export interface ProfileCandidate {profile:string;binding:WorkspaceIdentity|null;}
/** Never infer an account from an email, fork an existing match, or choose among
 * duplicate protected workspaces. Platform adapters must inspect existing files only. */
export function chooseNativeProfile(candidates:ProfileCandidate[],identity:WorkspaceIdentity,remembered:string|null):string|null {
 if(!uuid(identity.user_id)||!uuid(identity.company)||new URL(identity.origin).origin!==identity.origin)throw Error('Invalid workspace identity.');
 const matching=candidates.filter(c=>c.binding?.user_id===identity.user_id&&c.binding.company===identity.company&&c.binding.origin===identity.origin);
 if(remembered){const found=matching.find(c=>c.profile===remembered);if(!found)throw Error('The saved workspace selection could not be verified. Existing work has been preserved.');return found.profile;}
 if(matching.length>1)throw Error('More than one protected workspace matches this company. Contact support to select the original; no records have been merged.');
 return matching[0]?.profile??null;
}
