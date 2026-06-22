/// <reference types="vite/client" />

/**
 * Ambient module declarations for asset imports Vite understands at build time.
 * (We import GLB/HDRI by URL string at runtime, so these are mostly belt-and-
 * braces for any future static imports.)
 */
declare module '*.glb' {
  const src: string;
  export default src;
}
declare module '*.hdr' {
  const src: string;
  export default src;
}
declare module '*.ktx2' {
  const src: string;
  export default src;
}
