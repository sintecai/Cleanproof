import { Platform } from 'react-native';
// Adapted from the four supplied Stitch exports; no runtime CDN or trackers.
export const design = {
  colour: { navy: '#0b1c30', teal: '#006c49', ink: '#172b4d', muted: '#526477', canvas: '#f7f8f2', line: '#dce7df', red: '#ba1a1a', amber: '#78520a', soft: '#edf6f0', mint: '#d9f5e7' },
  font: { body: Platform.OS === 'web' ? 'Inter, system-ui, sans-serif' : undefined, heading: Platform.OS === 'web' ? 'Manrope, system-ui, sans-serif' : undefined },
  radius: { field: 12, card: 16, hero: 24 },
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};
