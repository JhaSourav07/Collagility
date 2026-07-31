import { describe, it, expect } from 'vitest';
import { StreamStateMachine } from './state.js';

describe('StreamStateMachine', () => {
  it('should transition through valid stream states', () => {
    const machine = new StreamStateMachine('stream-1', 'Idle');
    expect(machine.getState()).toBe('Idle');

    machine.transitionTo('Preparing');
    expect(machine.getState()).toBe('Preparing');

    machine.transitionTo('Streaming');
    expect(machine.getState()).toBe('Streaming');

    machine.transitionTo('Completed');
    expect(machine.getState()).toBe('Completed');
    expect(machine.isTerminal()).toBe(true);
  });

  it('should throw error on invalid transition', () => {
    const machine = new StreamStateMachine('stream-1', 'Idle');
    expect(() => machine.transitionTo('Completed')).toThrow(/Invalid stream state transition/);
  });

  it('should record state change history', () => {
    const machine = new StreamStateMachine('stream-1', 'Idle');
    machine.transitionTo('Preparing');
    machine.transitionTo('Streaming');

    const history = machine.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].previousState).toBe('Idle');
    expect(history[0].newState).toBe('Preparing');
    expect(history[1].previousState).toBe('Preparing');
    expect(history[1].newState).toBe('Streaming');
  });
});
