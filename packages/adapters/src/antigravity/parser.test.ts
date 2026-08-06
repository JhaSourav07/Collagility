import { describe, it, expect } from 'vitest';
import { AntigravityOutputParser } from './parser.js';

describe('AntigravityOutputParser Subagent Events', () => {
  it('should parse SUBAGENT_SPAWNED JSON stream event', () => {
    const parser = new AntigravityOutputParser();
    const event = parser.parseLine(
      JSON.stringify({
        type: 'subagent_spawned',
        subagentId: 'agent-42',
        taskDescription: 'Analyze workspace dependencies',
        activeTool: 'grep_search',
      })
    );

    expect(event.type).toBe('SUBAGENT_SPAWNED');
    expect(event.metadata?.subagentId).toBe('agent-42');
    expect(event.metadata?.taskDescription).toBe('Analyze workspace dependencies');
    expect(event.metadata?.activeTool).toBe('grep_search');

    const subagents = parser.getSubagents();
    expect(subagents).toHaveLength(1);
    expect(subagents[0].id).toBe('agent-42');
    expect(subagents[0].status).toBe('running');
  });

  it('should parse SUBAGENT_PROGRESS and update active tool / output logs', () => {
    const parser = new AntigravityOutputParser();
    parser.parseLine(
      JSON.stringify({
        type: 'subagent_spawned',
        subagentId: 'agent-42',
        taskDescription: 'Analyze workspace dependencies',
      })
    );

    const progressEvent = parser.parseLine(
      JSON.stringify({
        type: 'subagent_progress',
        subagentId: 'agent-42',
        activeTool: 'view_file',
        progress: 50,
        log: 'Reading package.json',
      })
    );

    expect(progressEvent.type).toBe('SUBAGENT_PROGRESS');
    expect(progressEvent.metadata?.activeTool).toBe('view_file');
    expect(progressEvent.metadata?.progress).toBe(50);

    const worker = parser.getSubagent('agent-42');
    expect(worker?.activeTool).toBe('view_file');
    expect(worker?.progress).toBe(50);
    expect(worker?.outputLogs).toContain('Reading package.json');
  });

  it('should parse SUBAGENT_COMPLETED event and mark worker finished', () => {
    const parser = new AntigravityOutputParser();
    parser.parseLine(
      JSON.stringify({
        type: 'subagent_spawned',
        subagentId: 'agent-42',
        taskDescription: 'Analyze workspace dependencies',
      })
    );

    const compEvent = parser.parseLine(
      JSON.stringify({
        type: 'subagent_completed',
        subagentId: 'agent-42',
        status: 'completed',
        result: 'All 9 packages analyzed',
      })
    );

    expect(compEvent.type).toBe('SUBAGENT_COMPLETED');

    const worker = parser.getSubagent('agent-42');
    expect(worker?.status).toBe('completed');
    expect(worker?.progress).toBe(100);
  });

  it('should parse plain text subagent event logs', () => {
    const parser = new AntigravityOutputParser();
    const spawnLine = parser.parseLine('[SUBAGENT_SPAWNED] worker-1 - Run unit test suite');
    expect(spawnLine.type).toBe('SUBAGENT_SPAWNED');
    expect(spawnLine.metadata?.subagentId).toBe('worker-1');

    const compLine = parser.parseLine('[SUBAGENT_COMPLETED] worker-1');
    expect(compLine.type).toBe('SUBAGENT_COMPLETED');
    expect(parser.getSubagent('worker-1')?.status).toBe('completed');
  });
});
