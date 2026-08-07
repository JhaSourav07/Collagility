import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { PtyTerminalHost, type IPtyProcess } from './pty-terminal-host.js';
import { SessionHostBroadcaster } from './session-host.js';
import { SessionClientStreamHandler } from './session-client.js';
import { PtyScreenBuffer } from './pty-screen-buffer.js';
import { formatRemoteScreenLines } from './ink/RemotePane.js';
import { FAKE_AGENT_CHUNKS, RAW_FIXTURE_OUTPUT } from '../../test-fixtures/fake-agent.js';
import { EVENT_TYPES } from '@collagility/protocol';

describe('Terminal Mirror End-to-End Parity & Coexistence Integration Test', () => {
  let mockHostWsClient: EventEmitter & { getClientId: () => string; send: (type: string, payload: any) => void };
  let mockJoinerWsClient: EventEmitter;

  beforeEach(() => {
    mockHostWsClient = Object.assign(new EventEmitter(), {
      getClientId: () => 'host-client-id-1',
      send: (type: string, payload: any) => {
        // Direct in-process loopback relay from Host -> Joiner WebSocket
        mockJoinerWsClient.emit(type, payload);
        mockJoinerWsClient.emit(type.toUpperCase(), payload);
      },
    });

    mockJoinerWsClient = new EventEmitter();
  });

  function createMockPtyProcess() {
    const dataEmitter = new EventEmitter();
    const exitEmitter = new EventEmitter();
    const proc: IPtyProcess = {
      onData: (listener) => {
        dataEmitter.on('data', listener);
        return { dispose: () => dataEmitter.off('data', listener) };
      },
      onExit: (listener) => {
        exitEmitter.on('exit', listener);
        return { dispose: () => exitEmitter.off('exit', listener) };
      },
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    };
    return { proc, dataEmitter, exitEmitter };
  }

  it('proves 1:1 character-for-character terminal grid parity between host and joiner while maintaining legacy mode coexistence', async () => {
    const sessionId = 'parity-e2e-session-999';

    // ------------------------------------------------------------------
    // 1. Independent Oracle Baseline (@xterm/headless fed directly with raw fixture)
    // ------------------------------------------------------------------
    const oracleBuffer = new PtyScreenBuffer({ cols: 80, rows: 24 });
    await oracleBuffer.write(RAW_FIXTURE_OUTPUT);
    const expectedOracleLines = oracleBuffer.getVisibleLines().map((l) => l.trimEnd());

    // ------------------------------------------------------------------
    // 2. Setup Host Side (New Opt-in PTY Host + Legacy SessionHostBroadcaster)
    // ------------------------------------------------------------------
    const { proc, dataEmitter, exitEmitter } = createMockPtyProcess();
    const mockSpawnPty = vi.fn().mockReturnValue(proc);

    // New Opt-in Raw PTY Host Streamer
    const ptyHost = new PtyTerminalHost({
      sessionId,
      wsClient: mockHostWsClient,
      spawnPtyFn: mockSpawnPty,
      flushIntervalMs: 10,
    });

    // Legacy Non-Opt-in Session Host Broadcaster
    const legacyBroadcaster = new SessionHostBroadcaster({
      sessionId,
      wsClient: mockHostWsClient,
      onEmitStream: (payload) => {
        mockHostWsClient.send('terminal.screen.stream', {
          sessionId,
          senderId: 'host-client-id-1',
          pane: 'right',
          data: payload.data,
          timestamp: Date.now(),
        });
      },
    });

    // ------------------------------------------------------------------
    // 3. Setup Joiner Side (SessionClientStreamHandler + PtyScreenBuffer)
    // ------------------------------------------------------------------
    let joinerPtyLines: string[] = [];
    let joinerLegacyData = '';

    const joinerClientHandler = new SessionClientStreamHandler({
      sessionId,
      wsClient: mockJoinerWsClient,
      onPtyUpdateScreen: (lines) => {
        joinerPtyLines = lines;
      },
      onUpdateScreen: (data) => {
        joinerLegacyData = data;
      },
    });

    // Start PTY Session
    ptyHost.startPtySession('agy', []);

    // ------------------------------------------------------------------
    // 4. Drive Pipeline with Deterministic Fixture Chunks
    // ------------------------------------------------------------------
    for (const chunk of FAKE_AGENT_CHUNKS) {
      // Feed chunk to host raw PTY capture pipeline
      ptyHost.writeRawData(chunk);

      // Feed chunk to host legacy stdout parser
      legacyBroadcaster.processStdout(chunk);

      // Short delay to simulate real-time chunked stdout emission
      await new Promise((r) => setTimeout(r, 15));
    }

    // Ensure all throttled buffers are flushed
    ptyHost.flush();
    exitEmitter.emit('exit', { exitCode: 0 });

    // Allow async Xterm buffer processing to settle
    await new Promise((r) => setTimeout(r, 30));

    // ------------------------------------------------------------------
    // 5. PARITY ASSERTION: Joiner PTY Lines MUST EQUAL Oracle Lines 1:1
    // ------------------------------------------------------------------
    expect(joinerClientHandler.hasPtyData()).toBe(true);

    const actualJoinerLines = joinerClientHandler.getPtyScreenLines().map((l) => l.trimEnd());

    // Character-for-character assertion against independent oracle screen
    expect(actualJoinerLines).toEqual(expectedOracleLines);

    // Verify key lines in the joiner display
    expect(actualJoinerLines[0]).toBe('[COLLAGILITY LIVE AGENT]');
    expect(actualJoinerLines[1]).toBe('Task: Run static analysis & byte-accurate terminal mirror test');
    expect(actualJoinerLines[2]).toBe('Step 1: Initializing PTY capture bridge...');
    // CR progress bar line must show final 100% state
    expect(actualJoinerLines[3]).toBe('Progress: [==========] 100%');
    expect(actualJoinerLines[4]).toBe('Parity Status: 100% character-for-character match');
    expect(actualJoinerLines[5]).toBe('✓ Final line overwritten clean via CR');

    // ------------------------------------------------------------------
    // 6. COEXISTENCE ASSERTION: Legacy Non-Opt-in Chat Mode Still Works
    // ------------------------------------------------------------------
    expect(joinerLegacyData).toBeTruthy();
    const formattedLegacyLines = formatRemoteScreenLines(joinerLegacyData, 80, 24);
    expect(formattedLegacyLines.some((l) => l.includes('Parity Status'))).toBe(true);

    // Teardown
    ptyHost.destroy();
  });
});
