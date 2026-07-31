import { colors } from './colors.js';
import { CLI_VERSION } from '../config/constants.js';

export function renderBanner(): string {
  const logo = `
   _____ ____  __    __    ___   ______ ____ __    IT Y
  / ___// __ \\/ /   / /   /   | / ____//  _// /   /  |/  /
 / /   / / / / /   / /   / /| |/ / __  / / / /   / /|_/ / 
/ /___/ /_/ / /___/ /___/ ___ / /_/ /_/ / / /___/ /  / /  
\\____/\\____/_____/_____/_/  |_\\____//___/_____/_/  /_/   
  `;

  return [
    colors.brand(logo),
    colors.dim(`  The Multiplayer Workspace for AI Coding Agents (v${CLI_VERSION})`),
    colors.dim('  ─────────────────────────────────────────────────────────────'),
  ].join('\n');
}
