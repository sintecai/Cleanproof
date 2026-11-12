/** A constrained preview must never select a desktop shell from the host viewport. */
export function layoutWidth(viewport: number, measured: number | null, phonePreview: boolean): number {
  const viewportWidth = Math.max(0, viewport);
  const constraint = phonePreview ? Math.min(viewportWidth, 430) : viewportWidth;
  return measured === null ? constraint : Math.min(constraint, Math.max(0, measured));
}
