import { spawn } from 'node:child_process';
import { CLI_VERSION } from '../config/constants.js';

export interface UpgradeOptions {
  force?: boolean;
}

export async function upgradeCommand(options: UpgradeOptions = {}): Promise<void> {
  console.log(`\n🔍 Checking for Collagility updates (current: v${CLI_VERSION})...`);

  let latestVersion = CLI_VERSION;
  try {
    const res = await fetch('https://registry.npmjs.org/collagility/latest');
    if (res.ok) {
      const data = (await res.json()) as { version?: string };
      if (data.version) {
        latestVersion = data.version;
      }
    }
  } catch {
    // If offline or network error, proceed with installer check
  }

  if (latestVersion === CLI_VERSION && !options.force) {
    console.log(`✓ Collagility is already up to date (v${CLI_VERSION}).`);
    console.log(`  Use 'collagility upgrade --force' to force re-install.\n`);
    return;
  }

  if (latestVersion !== CLI_VERSION) {
    console.log(`✨ New version available: v${latestVersion} (installed: v${CLI_VERSION})`);
  }
  console.log(`🚀 Launching Collagility installer...\n`);

  const isWindows = process.platform === 'win32';

  return new Promise<void>((resolve, reject) => {
    const child = isWindows
      ? spawn('powershell', ['-Command', 'iwr -useb https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.ps1 | iex'], { stdio: 'inherit' })
      : spawn('bash', ['-c', 'curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash'], { stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n🎉 Collagility upgraded successfully!\n`);
        resolve();
      } else {
        console.error(`\n✖ Upgrade failed with exit code ${code}.`);
        console.error(`  You can manually upgrade by running:\n  curl -fsSL https://raw.githubusercontent.com/JhaSourav07/Collagility/main/install.sh | bash\n`);
        reject(new Error(`Upgrade failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error(`✖ Failed to launch upgrade process: ${err.message}`);
      reject(err);
    });
  });
}
