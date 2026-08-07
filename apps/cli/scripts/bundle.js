import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

import fs from 'node:fs';

console.log('📦 Bundling collagility CLI entrypoint dist/main.js with esbuild...');

// Copy root README.md to apps/cli/README.md for NPM publishing
fs.copyFileSync(path.resolve(projectRoot, '../../README.md'), path.resolve(projectRoot, 'README.md'));
console.log('📄 Synchronized root README.md to apps/cli/README.md');

const externalPlugin = {
  name: 'external-except-monorepo',
  setup(build) {
    build.onResolve({ filter: /^@?[a-z0-9]/ }, (args) => {
      if (args.path.startsWith('@collagility/')) {
        return undefined;
      }
      return { external: true };
    });
  },
};

try {
  await esbuild.build({
    entryPoints: [path.join(projectRoot, 'src', 'main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outfile: path.join(projectRoot, 'dist', 'main.js'),
    plugins: [externalPlugin],
    sourcemap: false,
    minify: false,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  console.log('✓ ESBuild bundle generated successfully in dist/main.js');
} catch (err) {
  console.error('✖ Bundle failed:', err);
  process.exit(1);
}
