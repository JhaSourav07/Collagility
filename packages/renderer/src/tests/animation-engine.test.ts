import { describe, it, expect } from 'vitest';
import {
  SpinnerAnimation,
  ProgressBarAnimation,
  TypewriterAnimation,
  CursorPulseAnimation,
  AnimationEngine,
} from '../animation/animation-engine.js';

describe('Non-Blocking Micro-Animation & Motion Engine Suite', () => {
  it('SpinnerAnimation: cycles through all 10 Braille frames', () => {
    const spinner = new SpinnerAnimation();
    const frames: string[] = [];

    for (let i = 0; i < 10; i++) {
      frames.push(spinner.nextFrame());
    }

    expect(frames).toEqual(['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']);
    // Wraps back to frame 0
    expect(spinner.nextFrame()).toBe('⠋');
  });

  it('ProgressBarAnimation: renders progress bar with percentage', () => {
    const bar50 = ProgressBarAnimation.renderProgress(50, 10);
    expect(bar50).toBe('[━━━━━─────] 50%');

    const bar100 = ProgressBarAnimation.renderProgress(100, 10);
    expect(bar100).toBe('[━━━━━━━━━━] 100%');
  });

  it('TypewriterAnimation: reveals text step by step until complete', () => {
    const tw = new TypewriterAnimation('AI');
    expect(tw.nextFrame()).toBe('A');
    expect(tw.isComplete()).toBe(false);

    expect(tw.nextFrame()).toBe('AI');
    expect(tw.isComplete()).toBe(true);
  });

  it('CursorPulseAnimation: toggles cursor glyphs', () => {
    const pulse = new CursorPulseAnimation();
    expect(pulse.nextFrame()).toBe(' ');
    expect(pulse.nextFrame()).toBe('█');
  });

  it('AnimationEngine: non-blocking timer loop starts and stops cleanly (0% idle CPU usage)', () => {
    const engine = new AnimationEngine(50);
    let ticks = 0;
    const callback = () => {
      ticks++;
    };

    engine.registerCallback(callback);
    expect(engine.isRunning()).toBe(true);

    engine.unregisterCallback(callback);
    expect(engine.isRunning()).toBe(false); // Timer stopped automatically, 0% CPU usage
  });
});
