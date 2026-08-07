import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function checkTmuxAvailable(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (process.platform === 'win32') {
    return {
      ok: false,
      reason:
        "tmux isn't supported on native Windows. Please run Collagility inside WSL (Windows Subsystem for Linux) instead: https://learn.microsoft.com/en-us/windows/wsl/install",
    };
  }

  try {
    await execFileAsync('tmux', ['-V']);
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason:
        "tmux is not installed or not found in PATH. Please install tmux to host Collagility sessions (e.g., 'apt install tmux' on Debian/Ubuntu or 'brew install tmux' on macOS).",
    };
  }
}
