import { describe, it, expect } from 'vitest';
import { AntigravityOutputParser } from './parser.js';

describe('AntigravityOutputParser Subagent & Tool Events', () => {
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

  it('should parse TOOL_ANALYSIS for view_file and grep_search', () => {
    const parser = new AntigravityOutputParser();

    const viewEvent = parser.parseLine(
      JSON.stringify({
        toolName: 'view_file',
        filePath: 'index.html',
        startLine: 800,
        endLine: 1000,
      })
    );
    expect(viewEvent.type).toBe('TOOL_ANALYSIS');
    expect(viewEvent.metadata?.filePath).toBe('index.html');
    expect(viewEvent.metadata?.lineRange).toBe('lines 800–1000');
    expect(viewEvent.content).toContain('Analyzed index.html');

    const grepEvent = parser.parseLine(
      JSON.stringify({
        toolName: 'grep_search',
        query: '.flip-card',
      })
    );
    expect(grepEvent.type).toBe('TOOL_ANALYSIS');
    expect(grepEvent.metadata?.query).toBe('.flip-card');
    expect(grepEvent.content).toContain('Searched workspace for ".flip-card"');
  });

  it('should parse TOOL_FILE_EDIT and calculate diffs', () => {
    const parser = new AntigravityOutputParser();

    const editEvent = parser.parseLine(
      JSON.stringify({
        toolName: 'replace_file_content',
        targetFile: 'index.html',
        TargetContent: 'const old = true;',
        ReplacementContent: 'const updated = true;\nconst added = 123;',
      })
    );

    expect(editEvent.type).toBe('TOOL_FILE_EDIT');
    expect(editEvent.metadata?.targetFile).toBe('index.html');
    expect(editEvent.metadata?.deletedLines).toBe(1);
    expect(editEvent.metadata?.addedLines).toBe(2);
    expect(editEvent.metadata?.patch).toContain('- const old = true;');
    expect(editEvent.metadata?.patch).toContain('+ const updated = true;');
  });

  it('should format THOUGHT events as dimmed/italicized blockquotes', () => {
    const parser = new AntigravityOutputParser();

    const thoughtEvent = parser.parseLine('Analyzing workspace dependency structure...');
    expect(thoughtEvent.type).toBe('THOUGHT');
    expect(thoughtEvent.content).toBe('> _Analyzing workspace dependency structure..._');
  });

  it('should parse Eligibility check failed error with NETWORK_ELIGIBILITY_ERROR code', () => {
    const parser = new AntigravityOutputParser();
    const line = 'Error: Eligibility check failed: failed to get profile picture: Get "https://lh3.googleusercontent.com/a/...": dial tcp 192.178.211.132:443: i/o timeout';
    const parsed = parser.parseLine(line);

    expect(parsed.type).toBe('ERROR');
    expect(parsed.metadata?.errorCode).toBe('NETWORK_ELIGIBILITY_ERROR');
  });

  it('should strip raw step_update JSON telemetry strings from stream outputs', () => {
    const parser = new AntigravityOutputParser();

    const rawTelemetry = JSON.stringify({
      event: 'step_update',
      step_update: {
        step_type: 'system',
        state: 'RUNNING',
      },
    });

    const parsed = parser.parseLine(rawTelemetry);
    expect(parsed.content).toBe('');
  });

  it('should extract text_delta from agent_response step_update', () => {
    const parser = new AntigravityOutputParser();

    const textDeltaUpdate = JSON.stringify({
      event: 'step_update',
      step_update: {
        step_type: 'agent_response',
        text_delta: 'Hello, world!',
      },
    });

    const parsed = parser.parseLine(textDeltaUpdate);
    expect(parsed.type).toBe('TEXT');
    expect(parsed.content).toBe('Hello, world!');
  });

  it('should deduplicate consecutive identical tool analysis events', () => {
    const parser = new AntigravityOutputParser();

    const viewEvent = JSON.stringify({
      toolName: 'list_dir',
      filePath: 'workspace',
    });

    const first = parser.parseLine(viewEvent);
    expect(first.type).toBe('TOOL_ANALYSIS');
    expect(first.content).toContain('Listed directory workspace');

    const second = parser.parseLine(viewEvent);
    expect(second.content).toBe('');
  });

  it('should preserve consecutive TEXT deltas without deduplicating text streams', () => {
    const parser = new AntigravityOutputParser();

    const first = parser.parseLine('Same text delta line');
    expect(first.type).toBe('TEXT');
    expect(first.content).toBe('Same text delta line');

    const second = parser.parseLine('Same text delta line');
    expect(second.type).toBe('TEXT');
    expect(second.content).toBe('Same text delta line');
  });
});
