import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // three.js is large; pre-bundle the heaviest deps so dev cold-start is snappy.
  optimizeDeps: {
    include: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  build: {
    target: 'es2020',
    // Split the three.js ecosystem into its own chunk for better caching.
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          post: ['@react-three/postprocessing', 'postprocessing', 'n8ao'],
        },
      },
    },
  },
  // Allow loading WASM decoders (Draco/Basis) served from /node_modules if needed.
  assetsInclude: ['**/*.hdr', '**/*.glb', '**/*.ktx2'],
});
