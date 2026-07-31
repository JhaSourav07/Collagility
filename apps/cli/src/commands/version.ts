import { renderBanner } from '../terminal/banner.js';
import { CLI_VERSION } from '../config/constants.js';

export function versionCommand(): void {
  console.log(renderBanner());
  console.log(`Collagility CLI Version: ${CLI_VERSION}`);
}
