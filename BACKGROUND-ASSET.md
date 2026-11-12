# Full-page background asset

`assets/backgrounds/glass-water.jpg` is a locally bundled decorative image, generated with the built-in image-generation tool for this project. It is not inspection evidence and contains no customer information. The compressed 1024 × 1536 JPEG is approximately 238 KiB. Original generated artwork was converted to RGB JPEG for mobile delivery; no logo or product image was modified.

Generation brief: full-bleed pristine architectural glass, clear flowing water, soft fine foam at the lower edge, polished reflections; deep navy, muted emerald, pale mint and warm ivory. Photoreal macro atmospheric texture. No text, logos, people, icons, floating tiles or sparkle symbols.

`CleaningBackground.web.tsx` uses compositor transform/opacity keyframes, paused while hidden, disabled by `prefers-reduced-motion`. `CleaningBackground.tsx` uses the native animation driver and AccessibilityInfo/AppState. Both are owned by the persistent LayoutFrame, not individual route components. Readable white surfaces sit above the pointer-inert background. Report viewers/PDFs have their own static backgrounds and do not consume this artwork.
