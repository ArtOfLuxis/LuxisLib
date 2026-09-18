import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig({
    build: {
        assetsInlineLimit: 4096,
        minify: "esbuild",
        rollupOptions: {
            input: 'src/main.js',
            preserveEntrySignatures: "allow-extension",
            output: {
                entryFileNames: 'bundle.js',
                format: 'esm',
            }
        }
    },
    plugins: [
        checker({
            eslint: {
                useFlatConfig: true,
                lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
            },
        }),
    ],
});