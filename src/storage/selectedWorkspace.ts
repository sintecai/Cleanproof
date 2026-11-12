/** A selected company profile was created before activation. Losing its
 * encrypted snapshot must be an error, not a new empty database. The account's
 * initial profile can legitimately be new on first sign-in. */
export function selectedCompanyRequiresSnapshot(selected:string, accountDefault:string):boolean {
 return selected!==accountDefault;
}
export function ensureSelectedSnapshot(requireExisting:boolean,snapshot:unknown):void {
 if(requireExisting&&!snapshot)throw Error('The selected encrypted workspace is unavailable. Existing work has not been reset. Reopen the browser profile that contains your work and contact support.');
}
