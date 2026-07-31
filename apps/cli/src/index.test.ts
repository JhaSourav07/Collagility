import { describe, it, expect } from 'vitest';
import { createProgram } from './main.js';

describe('@collagility/cli', () => {
  it('should initialize commander CLI program with name collagility', () => {
    const program = createProgram();
    expect(program.name()).toBe('collagility');

    const commands = program.commands.map((cmd) => cmd.name());
    expect(commands).toContain('start');
    expect(commands).toContain('join');
    expect(commands).toContain('leave');
    expect(commands).toContain('server');
    expect(commands).toContain('sessions');
    expect(commands).toContain('version');
  });
});
