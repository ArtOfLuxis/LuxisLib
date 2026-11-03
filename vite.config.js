import { defineConfig } from 'vite';

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