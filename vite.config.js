import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

/**
 * viteVersionStamp
 * ----------------
 * Writes public/version.json with the current build timestamp before every
 * production build. During `vite dev` this is skipped so the file isn't
 * unnecessarily touched.
 */
function viteVersionStamp() {
  return {
    name: 'version-stamp',
    // Only run during the production build
    apply: 'build',
    buildStart() {
      const version = {
        version: `${Date.now()}`,        // unique per deploy
        builtAt: new Date().toISOString()
      };
      const dest = path.resolve(__dirname, 'public', 'version.json');
      fs.writeFileSync(dest, JSON.stringify(version, null, 2));
      console.log(`[version-stamp] Wrote version.json → ${version.version}`);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteVersionStamp()],

  build: {
    // Content-hash every output chunk/asset so CDN caching is always safe
    rollupOptions: {
      output: {
        // JS chunks
        chunkFileNames:  'assets/[name]-[hash].js',
        entryFileNames:  'assets/[name]-[hash].js',
        // CSS + other assets
        assetFileNames:  'assets/[name]-[hash][extname]',
      }
    }
  }
});
