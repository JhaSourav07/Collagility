import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const bundlePath = path.join(projectRoot, 'dist', 'bundle.cjs');
const binariesDir = path.join(projectRoot, 'dist', 'binaries');
const releasesDir = path.join(projectRoot, 'dist', 'releases');

if (!fs.existsSync(bundlePath)) {
  console.error('✖ Bundle dist/bundle.cjs missing. Please run `pnpm run bundle` first.');
  process.exit(1);
}

fs.mkdirSync(binariesDir, { recursive: true });
fs.mkdirSync(releasesDir, { recursive: true });

const targets = [
  { target: 'node20-linux-x64', name: 'collagility-linux-x64', archive: 'collagility-linux-x64.tar.gz' },
  { target: 'node20-linux-arm64', name: 'collagility-linux-arm64', archive: 'collagility-linux-arm64.tar.gz' },
  { target: 'node20-macos-x64', name: 'collagility-macos-x64', archive: 'collagility-macos-x64.tar.gz' },
  { target: 'node20-macos-arm64', name: 'collagility-macos-arm64', archive: 'collagility-macos-arm64.tar.gz' },
  { target: 'node20-win-x64', name: 'collagility-windows-x64.exe', archive: 'collagility-windows-x64.zip' },
];

console.log('⚡ Packaging standalone binaries with pkg...');

for (const t of targets) {
  const outputPath = path.join(binariesDir, t.name);
  console.log(`Building binary for target: ${t.target} -> ${t.name}`);

  try {
    execSync(`npx @yao-pkg/pkg --target ${t.target} --output "${outputPath}" "${bundlePath}"`, {
      stdio: 'inherit',
      cwd: projectRoot,
    });
    console.log(`✓ Generated ${t.name}`);
  } catch (err) {
    console.error(`✖ Failed to build binary for ${t.target}:`, err);
  }
}

console.log('📦 Creating release archives (.tar.gz / .zip)...');

for (const t of targets) {
  const binaryPath = path.join(binariesDir, t.name);
  const archivePath = path.join(releasesDir, t.archive);

  if (!fs.existsSync(binaryPath)) {
    console.warn(`⚠️ Warning: Binary ${binaryPath} not found. Skipping archive creation.`);
    continue;
  }

  try {
    if (t.archive.endsWith('.tar.gz')) {
      const binaryFileName = t.name;
      // Package binary named "collagility" inside tarball so extraction produces "collagility" executable
      const tempDir = path.join(binariesDir, `temp-${t.name}`);
      fs.mkdirSync(tempDir, { recursive: true });
      fs.copyFileSync(binaryPath, path.join(tempDir, 'collagility'));
      execSync(`chmod +x "${path.join(tempDir, 'collagility')}"`);

      execSync(`tar -czf "${archivePath}" -C "${tempDir}" collagility`, { stdio: 'inherit' });
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`✓ Created release archive: dist/releases/${t.archive}`);
    } else if (t.archive.endsWith('.zip')) {
      const tempDir = path.join(binariesDir, `temp-${t.name}`);
      fs.mkdirSync(tempDir, { recursive: true });
      fs.copyFileSync(binaryPath, path.join(tempDir, 'collagility.exe'));

      execSync(`zip -j "${archivePath}" "${path.join(tempDir, 'collagility.exe')}"`, { stdio: 'inherit' });
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`✓ Created release archive: dist/releases/${t.archive}`);
    }
  } catch (err) {
    console.error(`✖ Failed to create archive ${t.archive}:`, err);
  }
}

console.log('🎉 Packaging complete! All binaries and release archives ready in apps/cli/dist/releases/');
