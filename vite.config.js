import { defineConfig } from 'vite';

export default defineConfig({
    // Relative asset paths so the build works from any sub-path
    // (GitHub Pages serves it at /vincenzo-the-mice-killer/)
    base: './',
    build: {
        // GitHub Pages is configured to serve the docs/ folder of the main branch
        outDir: 'docs',
        emptyOutDir: true,
        // Three.js alone is ~580 kB minified; that's expected for this game
        chunkSizeWarningLimit: 800
    },
    server: {
        port: 5173,
        open: true
    }
});
