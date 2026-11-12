/** A report return is eligible only for a short, uninterrupted background visit. */
export function mayResumeReportReturn(hiddenAt:number | null, now:number, hadReport:boolean, sameAccount:boolean):boolean {
 return hiddenAt !== null && hadReport && sameAccount && now >= hiddenAt && now - hiddenAt <= 60000;
}
