import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { SessionHostBroadcaster } from './session-host.js';
import { AntigravityAIAdapter } from '@collagility/adapters';

describe('SessionHostBroadcaster stdout event handling', () => {
  let broadcaster: SessionHostBroadcaster;
  let broadcastSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    broadcastSpy = vi.fn();
    broadcaster = new SessionHostBroadcaster({
      sessionId: 'test-session',
      onEmitStream: broadcastSpy,
    });
  });

  function createFakeProcess() {
    const proc = new EventEmitter() as any;
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.stdin = { write: vi.fn(), writable: true };
    proc.killed = false;
    return proc;
  }

  it('should process output exactly once when targetAdapter stdout is bound to processStdout', async () => {
    const fakeProcess = createFakeProcess();
    const adapter = new AntigravityAIAdapter({
      mockProcessFactory: () => fakeProcess,
    });
    adapter.setSecurityMode('auto');

    await adapter.start();

    // Fixed start.ts binding: only 'stdout' is bound to onStdoutData
    const onStdoutData = (data: string) => {
      broadcaster.processStdout(data);
    };
    adapter.on('stdout' as any, onStdoutData);

    const promptPromise = adapter.sendPrompt('Test prompt');

    fakeProcess.stdout.emit(
      'data',
      Buffer.from(
        JSON.stringify({
          event: 'step_update',
          step_update: { step_type: 'agent_response', text_delta: 'Streamed response chunk ' },
        }) + '\n'
      )
    );

    fakeProcess.emit('exit', 0, null);
    await promptPromise;

    // Verify broadcastSpy received the text delta chunk exactly ONCE
    const textEmissions = broadcastSpy.mock.calls.filter(
      (call) => call[0]?.data?.includes('Streamed response chunk')
    );

    expect(textEmissions).toHaveLength(1);
    expect(textEmissions[0][0].data).toBe('Streamed response chunk ');
  });

  it('proves double-binding stdout and pty.data causes duplicate stream chunk processing', async () => {
    const doubleBroadcaster = new SessionHostBroadcaster({
      sessionId: 'test-session-double',
      onEmitStream: broadcastSpy,
    });

    const fakeProcess = createFakeProcess();
    const adapter = new AntigravityAIAdapter({
      mockProcessFactory: () => fakeProcess,
    });
    adapter.setSecurityMode('auto');

    await adapter.start();

    // Replicate legacy double-binding (binding BOTH 'stdout' and 'pty.data' to onStdoutData)
    const onStdoutData = (data: string) => {
      doubleBroadcaster.processStdout(data);
    };
    adapter.on('stdout' as any, onStdoutData);
    adapter.on('pty.data' as any, onStdoutData);

    const promptPromise = adapter.sendPrompt('Test dual binding');

    fakeProcess.stdout.emit(
      'data',
      Buffer.from(
        JSON.stringify({
          event: 'step_update',
          step_update: { step_type: 'agent_response', text_delta: 'Streamed response chunk ' },
        }) + '\n'
      )
    );

    fakeProcess.emit('exit', 0, null);
    await promptPromise;

    const emittedContents = broadcastSpy.mock.calls.map((call) => call[0]?.data);
    const emissions = emittedContents.filter(
      (content) => typeof content === 'string' && content.includes('Streamed response chunk')
    );

    // Double-binding invokes processStdout twice, producing duplicate broadcast chunks
    expect(emissions).toHaveLength(2);
  });

  it('should prevent parser buffer corruption when partial JSON chunks arrive under single stdout binding', async () => {
    const fakeProcess = createFakeProcess();
    const adapter = new AntigravityAIAdapter({
      mockProcessFactory: () => fakeProcess,
    });
    adapter.setSecurityMode('auto');

    await adapter.start();

    // Fixed binding: only 'stdout'
    const onStdoutData = (data: string) => {
      broadcaster.processStdout(data);
    };
    adapter.on('stdout' as any, onStdoutData);

    const promptPromise = adapter.sendPrompt('Test partial stream');

    // Chunk 1: Partial JSON
    fakeProcess.stdout.emit('data', Buffer.from('{"type":"thought",'));
    // Chunk 2: Remainder of JSON
    fakeProcess.stdout.emit('data', Buffer.from('"content":"Partial content"}\n'));

    fakeProcess.emit('exit', 0, null);
    await promptPromise;

    const emittedContents = broadcastSpy.mock.calls.map((call) => call[0]?.data);
    const validEmissions = emittedContents.filter(
      (content) => typeof content === 'string' && content.includes('Partial content')
    );

    // Single binding parses cleanly exactly once without JSON corruption
    expect(validEmissions).toHaveLength(1);
    expect(validEmissions[0]).toBe('> _Partial content_');
  });
});
