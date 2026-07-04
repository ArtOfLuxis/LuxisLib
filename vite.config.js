import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        assetsInlineLimit: 100000000, //100mb
        minify: false,
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