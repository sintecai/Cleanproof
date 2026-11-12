/** The official UMD build exposes the same public API; this declaration adds no runtime code. */
declare module 'pdf-lib/dist/pdf-lib.js' {
  export {PDFDocument,PageSizes,rgb} from 'pdf-lib';
}
