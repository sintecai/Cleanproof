/** Read the submitted controls, including browser/password-manager autofill.
 * Credentials remain transient: never log or persist this result. Passwords are
 * deliberately not trimmed, normalised or substituted from stale React state.
 */
export function readAccountForm(form:Pick<FormData,'get'>){
 const text=(key:string)=>{const value=form.get(key);return typeof value==='string'?value:'';};
 return {name:text('fullName'),email:text('email'),password:text('password'),confirm:text('confirmPassword')};
}
