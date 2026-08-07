import { describe, it, expect } from 'vitest';
import { AgentPtyProcess, processPtyAutoApproval, type IPtyLike } from './pty-process.js';

class MockPty implements IPtyLike {
  public dataListeners: Array<(data: string) => void> = [];
  public exitListeners: Array<(e: { exitCode: number; signal?: number }) => void> = [];
  public written: string[] = [];
  public resized: Array<{ cols: number; rows: number }> = [];
  public killedSignal?: string;

  onData(listener: (data: string) => void) {
    this.dataListeners.push(listener);
    return {
      dispose: () => {
        this.dataListeners = this.dataListeners.filter((l) => l !== listener);
      },
    };
  }

  onExit(listener: (e: { exitCode: number; signal?: number }) => void) {
    this.exitListeners.push(listener);
    return {
      dispose: () => {
        this.exitListeners = this.exitListeners.filter((l) => l !== listener);
      },
    };
  }

  write(data: string) {
    this.written.push(data);
  }

  resize(cols: number, rows: number) {
    this.resized.push({ cols, rows });
  }

  kill(signal?: string) {
    this.killedSignal = signal;
  }

  emitData(data: string) {
    for (const listener of this.dataListeners) {
      listener(data);
    }
  }

  emitExit(exitCode: number, signal?: number) {
    for (const listener of this.exitListeners) {
      listener({ exitCode, signal });
    }
  }
}

describe('AgentPtyProcess', () => {
  it('parses synthetic ANSI sequences and produces styled runs snapshot', async () => {
    let mockPtyInstance: MockPty | null = null;

    const agentPty = new AgentPtyProcess({
      binaryPath: 'bash',
      cols: 40,
      rows: 5,
      mockPtyFactory: () => {
        mockPtyInstance = new MockPty();
        return mockPtyInstance;
      },
    });

    agentPty.spawn();
    expect(mockPtyInstance).not.toBeNull();

    const receivedChunks: string[] = [];
    agentPty.onData((chunk) => receivedChunks.push(chunk));

    // Emit synthetic bytes: ANSI red bold text + cursor movement
    // \x1b[1;31mRed Bold\x1b[0m Normal text
    // \x1b[2;5HPositioned (move to row 2, col 5)
    const ansiPayload = '\x1b[1;31mRed Bold\x1b[0m Normal\r\n\x1b[2;5HPositioned';
    mockPtyInstance!.emitData(ansiPayload);

    expect(receivedChunks).toEqual([ansiPayload]);

    // Give xterm parser a tick to finish async write processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    const snapshot = agentPty.getScreenSnapshot();
    expect(snapshot).toHaveLength(5);

    // Row 0 should contain styled runs
    const row0 = snapshot[0];
    const redBoldRun = row0.find((r) => r.text === 'Red Bold');
    expect(redBoldRun).toBeDefined();
    expect(redBoldRun?.bold).toBe(true);
    expect(redBoldRun?.fg).toBeDefined(); // ANSI palette red index

    const normalRun = row0.find((r) => r.text.includes('Normal'));
    expect(normalRun).toBeDefined();
    expect(normalRun?.bold).toBeUndefined();

    // Row 1 should have "Positioned" at column offset 4 (1-based col 5)
    const row1 = snapshot[1];
    const row1Text = row1.map((r) => r.text).join('');
    expect(row1Text.startsWith('    Positioned')).toBe(true);
  });

  it('forwards write, resize, exit, and kill calls correctly', () => {
    let mockPtyInstance: MockPty | null = null;

    const agentPty = new AgentPtyProcess({
      binaryPath: 'sh',
      cols: 80,
      rows: 24,
      mockPtyFactory: () => {
        mockPtyInstance = new MockPty();
        return mockPtyInstance;
      },
    });

    agentPty.spawn();

    agentPty.write('ls -la\n');
    expect(mockPtyInstance!.written).toEqual(['ls -la\n']);

    agentPty.resize(100, 30);
    expect(mockPtyInstance!.resized).toEqual([{ cols: 100, rows: 30 }]);

    let exitReported = false;
    agentPty.onExit((event) => {
      if (event.exitCode === 0) exitReported = true;
    });

    mockPtyInstance!.emitExit(0);
    expect(exitReported).toBe(true);

    agentPty.kill('SIGKILL');
    expect(mockPtyInstance!.killedSignal).toBe('SIGKILL');
  });

  it('supports scrolling through active scrollback buffer via scrollPages/scrollLines', async () => {
    let mockPtyInstance: MockPty | null = null;

    const agentPty = new AgentPtyProcess({
      binaryPath: 'bash',
      cols: 40,
      rows: 5,
      mockPtyFactory: () => {
        mockPtyInstance = new MockPty();
        return mockPtyInstance;
      },
    });

    agentPty.spawn();

    // Emit 20 lines of output to fill scrollback
    const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`).join('\r\n');
    mockPtyInstance!.emitData(lines);

    await new Promise((resolve) => setTimeout(resolve, 50));

    // Initially at bottom: last visible line should be "Line 20"
    const bottomSnapshot = agentPty.getScreenSnapshot();
    const bottomText = bottomSnapshot.map((r) => r.map((cell) => cell.text).join('')).join('\n');
    expect(bottomText).toContain('Line 20');

    // Scroll up by 1 page
    agentPty.scrollPages(-1);

    const scrolledSnapshot = agentPty.getScreenSnapshot();
    const scrolledText = scrolledSnapshot.map((r) => r.map((cell) => cell.text).join('')).join('\n');
    expect(scrolledText).not.toContain('Line 20');
    expect(scrolledText).toContain('Line 15');

    // Scroll back to bottom
    agentPty.scrollToBottom();
    const resetSnapshot = agentPty.getScreenSnapshot();
    const resetText = resetSnapshot.map((r) => r.map((cell) => cell.text).join('')).join('\n');
    expect(resetText).toContain('Line 20');
  });
});

describe('processPtyAutoApproval', () => {
  it('auto mode writes expected keystroke when risk is LOW', () => {
    let written = '';
    const handled = processPtyAutoApproval(
      'Allow tool execution? [Y/n]',
      {
        securityMode: 'auto',
        evaluateRisk: () => 'LOW',
        approvalKeystroke: '\r',
      },
      (keystroke) => {
        written = keystroke;
      }
    );

    expect(handled).toBe(true);
    expect(written).toBe('\r');
  });

  it('manual mode never auto-writes regardless of risk level', () => {
    let written = '';
    const handledLow = processPtyAutoApproval(
      'Proceed with read_file? [Y/n]',
      {
        securityMode: 'manual',
        evaluateRisk: () => 'LOW',
      },
      (keystroke) => {
        written = keystroke;
      }
    );

    const handledHigh = processPtyAutoApproval(
      'Proceed with delete_file? [Y/n]',
      {
        securityMode: 'manual',
        evaluateRisk: () => 'HIGH',
      },
      (keystroke) => {
        written = keystroke;
      }
    );

    expect(handledLow).toBe(false);
    expect(handledHigh).toBe(false);
    expect(written).toBe('');
  });

  it('accept-edits mode writes keystroke for LOW/MEDIUM risk and blocks HIGH risk', () => {
    let written = '';
    const handledMedium = processPtyAutoApproval(
      'Apply edit to src/main.ts? [Y/n]',
      {
        securityMode: 'accept-edits',
        evaluateRisk: () => 'MEDIUM',
      },
      (k) => {
        written = k;
      }
    );
    expect(handledMedium).toBe(true);
    expect(written).toBe('\r');

    written = '';
    const handledHigh = processPtyAutoApproval(
      'Run rm -rf /? [y/N]',
      {
        securityMode: 'accept-edits',
        evaluateRisk: () => 'HIGH',
      },
      (k) => {
        written = k;
      }
    );
    expect(handledHigh).toBe(false);
    expect(written).toBe('');
  });
});
