import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('📦 Bundling @collagility/cli with esbuild...');

try {
  await esbuild.build({
    entryPoints: [path.join(projectRoot, 'src', 'index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: path.join(projectRoot, 'dist', 'bundle.cjs'),
    sourcemap: false,
    minify: false,
    loader: {
      '.ts': 'ts',
    },
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });

  console.log('✓ ESBuild bundle generated: apps/cli/dist/bundle.cjs');
} catch (err) {
  console.error('✖ Bundle failed:', err);
  process.exit(1);
}
