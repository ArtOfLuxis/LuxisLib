import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
    build: {
        assetsInlineLimit: 1000000,
        minify: "oxc",
        rollupOptions: {
            input: 'src/main.js',
            preserveEntrySignatures: "allow-extension",
            output: {
                entryFileNames: 'bundle.js',
                format: 'esm',
            }
        }
    }
});