/**
 * Deterministic fake agent fixture script for PTY terminal mirror end-to-end parity test.
 * Emits multi-line text, ANSI colors, carriage-return (\r) line redraws, and chunked stdout.
 */

export const FAKE_AGENT_CHUNKS = [
  '\x1b[2J\x1b[H\x1b[32m[COLLAGILITY LIVE AGENT]\x1b[0m\r\n',
  'Task: Run static analysis & byte-accurate terminal mirror test\r\n',
  'Step 1: Initializing PTY capture bridge...\r\n',
  'Progress: [==        ] 20%\r',
  'Progress: [======    ] 60%\r',
  'Progress: [==========] 100%\r\n',
  '\x1b[1;34mParity Status:\x1b[0m 100% character-for-character match\r\n',
  '✓ Final line overwritten clean via CR\r\n',
];

export const RAW_FIXTURE_OUTPUT = FAKE_AGENT_CHUNKS.join('');

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const chunk of FAKE_AGENT_CHUNKS) {
    process.stdout.write(chunk);
  }
}
