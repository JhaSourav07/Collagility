import React from 'react';
import { render } from 'ink';
import { describe, it, expect } from 'vitest';
import { AITerminalPane, type ScreenRow } from './AITerminalPane.js';
import { PassThrough } from 'node:stream';

describe('AITerminalPane', () => {
  it('renders fixture ScreenRow snapshot with styled text runs and focus indicator', () => {
    const fixture: ScreenRow[] = [
      [
        { text: 'Header: ', bold: true, fg: 'cyan' },
        { text: 'Ready', fg: '2' },
      ],
      [
        { text: 'Error in line 5', fg: '1', underline: true },
      ],
    ];

    let output = '';
    const stdout = new PassThrough();
    stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const instance = render(
      <AITerminalPane snapshot={fixture} isFocused={true} title="Test Agent PTY" />,
      { stdout: stdout as any, debug: true }
    );

    expect(output).toContain('Test Agent PTY');
    expect(output).toContain('● live');
    expect(output).toContain('Header:');
    expect(output).toContain('Ready');
    expect(output).toContain('Error in line 5');

    instance.unmount();
  });

  it('renders idle status indicator when isFocused is false', () => {
    const fixture: ScreenRow[] = [[{ text: 'Idle test' }]];

    let output = '';
    const stdout = new PassThrough();
    stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    const instance = render(
      <AITerminalPane snapshot={fixture} isFocused={false} />,
      { stdout: stdout as any, debug: true }
    );

    expect(output).toContain('○ idle');
    expect(output).toContain('Idle test');

    instance.unmount();
  });
});
