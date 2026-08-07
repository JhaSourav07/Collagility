/**
 * Utility functions for terminal screen buffer management, trimming, and deduplication.
 */

export function appendAndTrimTerminalBuffer(
  existingBuffer: string,
  newData: string,
  maxLines = 300,
  maxBytes = 50000
): string {
  if (!newData) return existingBuffer;

  let combined: string;
  if (!existingBuffer) {
    combined = newData;
  } else {
    combined = `${existingBuffer}\n${newData}`;
  }

  let lines = combined.split(/\r?\n/);

  // Detect re-initialization welcome banners (e.g., "[Live Terminal - agy]", "[COLLAGILITY LIVE AGENT]")
  const bannerPattern = /^(?:🟢|\*|●)?\s*\[(?:COLLAGILITY|Live Terminal|agy|Gemini)[^\]]*\]/i;
  const bannerIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (bannerPattern.test(lines[i].trim())) {
      bannerIndices.push(i);
    }
  }

  // If host session re-initialized and emitted a new welcome banner, drop stale output prior to latest banner
  if (bannerIndices.length > 1) {
    const lastBannerIdx = bannerIndices[bannerIndices.length - 1];
    lines = lines.slice(lastBannerIdx);
  }

  // Enforce max display window lines count
  if (lines.length > maxLines) {
    lines = lines.slice(-maxLines);
  }

  let result = lines.join('\n');

  // Enforce maximum memory byte length
  if (result.length > maxBytes) {
    result = result.slice(-maxBytes);
  }

  return result;
}
