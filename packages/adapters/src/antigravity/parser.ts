export type InternalEventType =
  | 'THOUGHT'
  | 'TOOL_CALL'
  | 'TOOL_ANALYSIS'
  | 'TOOL_FILE_EDIT'
  | 'FILE_CHANGE'
  | 'ERROR'
  | 'SUBAGENT_SPAWNED'
  | 'SUBAGENT_PROGRESS'
  | 'SUBAGENT_COMPLETED';

export interface SubagentWorkerState {
  id: string;
  taskDescription: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  activeTool?: string;
  progress?: number;
  outputLogs: string[];
}

export interface AntigravityParsedEvent {
  type: InternalEventType | 'TEXT' | 'COMPLETION';
  content: string;
  metadata?: {
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    filePath?: string;
    targetFile?: string;
    startLine?: number;
    endLine?: number;
    lineRange?: string;
    query?: string;
    addedLines?: number;
    deletedLines?: number;
    patch?: string;
    diffLines?: Array<{ type: 'add' | 'delete' | 'context'; line: string }>;
    changeType?: 'created' | 'modified' | 'deleted';
    errorCode?: string;
    warning?: string;
    subagentId?: string;
    taskDescription?: string;
    activeTool?: string;
    status?: 'running' | 'completed' | 'failed' | 'idle';
    progress?: number;
    outputLogs?: string[];
    rawThought?: string;
    usage?: unknown;
    raw?: unknown;
  };
}

function parseOrGenerateDiff(
  patchInput?: string,
  targetContent?: string,
  replacementContent?: string,
  additions?: number,
  deletions?: number
) {
  let patch = patchInput || '';
  let addedLines = additions || 0;
  let deletedLines = deletions || 0;
  const diffLines: Array<{ type: 'add' | 'delete' | 'context'; line: string }> = [];

  if (patch) {
    const lines = patch.split(/\r?\n/);
    let aCount = 0;
    let dCount = 0;
    for (const l of lines) {
      if (l.startsWith('+') && !l.startsWith('+++')) {
        aCount++;
        diffLines.push({ type: 'add', line: l.slice(1) });
      } else if (l.startsWith('-') && !l.startsWith('---')) {
        dCount++;
        diffLines.push({ type: 'delete', line: l.slice(1) });
      } else if (!l.startsWith('@@') && !l.startsWith('diff')) {
        diffLines.push({ type: 'context', line: l.startsWith(' ') ? l.slice(1) : l });
      }
    }
    if (!additions) addedLines = aCount;
    if (!deletions) deletedLines = dCount;
  } else if (targetContent !== undefined || replacementContent !== undefined) {
    const targetArr = targetContent ? targetContent.split(/\r?\n/) : [];
    const replacementArr = replacementContent ? replacementContent.split(/\r?\n/) : [];

    deletedLines = targetArr.length;
    addedLines = replacementArr.length;

    const patchParts: string[] = [];
    for (const t of targetArr) {
      patchParts.push(`- ${t}`);
      diffLines.push({ type: 'delete', line: t });
    }
    for (const r of replacementArr) {
      patchParts.push(`+ ${r}`);
      diffLines.push({ type: 'add', line: r });
    }
    patch = patchParts.join('\n');
  }
  return { patch, addedLines, deletedLines, diffLines };
}

function tryParseJsonWithExtraBraces(input: string): any | null {
  let str = input.trim();
  while (str.length > 0 && str.startsWith('{')) {
    try {
      return JSON.parse(str);
    } catch {
      str = str.slice(0, -1).trim();
    }
  }
  return null;
}

import { EventEmitter } from 'node:events';

export class AntigravityOutputParser extends EventEmitter {
  private buffer = '';
  private subagentsMap = new Map<string, SubagentWorkerState>();
  private lastEmittedEvent: { type: string; content: string } | null = null;

  constructor() {
    super();
  }

  public getSubagents(): SubagentWorkerState[] {
    return Array.from(this.subagentsMap.values());
  }

  public getSubagent(id: string): SubagentWorkerState | undefined {
    return this.subagentsMap.get(id);
  }

  /**
   * Parse a single line from stdout or stderr with JSON filtering and event deduplication.
   */
  public parseLine(line: string): AntigravityParsedEvent {
    let trimmed = line.trim();
    if (!trimmed || /^\s*[\}\]\,\;]+\s*$/.test(trimmed)) {
      return { type: 'TEXT', content: '' };
    }

    let event: AntigravityParsedEvent;

    // Try extracting JSON payload if line starts with {
    if (trimmed.startsWith('{')) {
      const json = tryParseJsonWithExtraBraces(trimmed);
      if (json) {
        event = this.parseJsonObject(json);
      } else {
        event = this.parseLineInternal(trimmed);
      }
    } else if (trimmed.includes('{"event":') || trimmed.includes('{"step_type":') || trimmed.includes('{"type":')) {
      const jsonMatch = trimmed.match(/\{"(?:event|step_type|type)":.*/);
      if (jsonMatch) {
        const json = tryParseJsonWithExtraBraces(jsonMatch[0]);
        if (json) {
          event = this.parseJsonObject(json);
        } else {
          const cleaned = trimmed
            .replace(/\{"(?:event|step_type|type)":.*/, '')
            .replace(/[\}\]\,]+$/, '')
            .trim();
          event = cleaned && !/^\s*[\}\]\,\;]+\s*$/.test(cleaned)
            ? this.parseLineInternal(cleaned)
            : { type: 'TEXT', content: '' };
        }
      } else {
        event = this.parseLineInternal(trimmed);
      }
    } else {
      event = this.parseLineInternal(trimmed);
    }

    // Deduplicate consecutive identical structured events (excluding TEXT stream deltas)
    if (
      event.content &&
      (event.type === 'THOUGHT' ||
        event.type === 'TOOL_ANALYSIS' ||
        event.type === 'TOOL_FILE_EDIT' ||
        event.type === 'FILE_CHANGE')
    ) {
      if (
        this.lastEmittedEvent &&
        this.lastEmittedEvent.type === event.type &&
        this.lastEmittedEvent.content === event.content
      ) {
        return { type: 'TEXT', content: '' };
      }
      this.lastEmittedEvent = { type: event.type, content: event.content };
    }

    return event;
  }

  private parseJsonObject(json: any): AntigravityParsedEvent {
    // Handle agy stream-json top-level events: init, step_update, result
    if (json.event === 'init') {
      return {
        type: 'TEXT',
        content: '▸ Initializing Antigravity AI Session...',
        metadata: { raw: json },
      };
    }

    if (json.event === 'result' && json.result) {
      const res = json.result;
      const status = res.status || 'SUCCESS';
      const responseText = res.response || '';
      return {
        type: 'COMPLETION',
        content: responseText,
        metadata: { status, usage: res.usage, raw: json },
      };
    }

    if (json.event === 'step_update' && json.step_update) {
      const su = json.step_update;
      const stepType = su.step_type;
      const state = su.state;
      const toolInfo = su.tool_info || {};
      const toolName = String(su.tool_name || toolInfo.name || toolInfo.tool_name || '').toLowerCase();
      const params = toolInfo.parameters || su.parameters || {};

      if (state === 'ERROR') {
        const errObj = toolInfo.error || su.error || {};
        const errorMsg = typeof errObj === 'string' ? errObj : (errObj.message || 'Tool execution error');
        return {
          type: 'ERROR',
          content: `✖ Tool Error [${toolName || 'tool'}]: ${errorMsg}`,
          metadata: { errorCode: 'TOOL_ERROR', raw: json },
        };
      }

      if (stepType === 'tool') {
        // File Analysis (view_file, grep_search, list_dir)
        if (toolName === 'view_file' || toolName === 'grep_search' || toolName === 'list_dir' || toolName === 'list_directory' || toolName === 'read_url_content') {
          const filePath = params.AbsolutePath || params.filePath || params.file || params.path || params.SearchPath;
          const query = params.Query || params.query || params.term;
          const startLine = params.StartLine || params.startLine;
          const endLine = params.EndLine || params.endLine;
          let lineRange: string | undefined;
          if (startLine !== undefined || endLine !== undefined) {
            lineRange = startLine !== undefined && endLine !== undefined ? `lines ${startLine}–${endLine}` : `line ${startLine}+`;
          }
          let content = '';
          if (toolName.includes('grep') || toolName.includes('search')) {
            content = `🔎 Searched workspace for "${query || ''}"`;
          } else if (toolName.includes('list')) {
            content = `📁 Listed directory ${filePath || 'workspace'}`;
          } else {
            content = `🔍 Analyzed ${filePath || 'file'}${lineRange ? ` (${lineRange})` : ''}`;
          }
          return {
            type: 'TOOL_ANALYSIS',
            content,
            metadata: { toolName, filePath, startLine, endLine, lineRange, query, toolArgs: params, raw: json },
          };
        }

        // File Edit (write_to_file, replace_file_content, multi_replace_file_content, edit_file)
        if (toolName === 'write_to_file' || toolName === 'replace_file_content' || toolName === 'multi_replace_file_content' || toolName === 'edit_file' || toolName === 'write_file') {
          const targetFile = params.TargetFile || params.targetFile || params.filePath || params.path || 'file';
          const targetContent = params.TargetContent || params.targetContent;
          const replacementContent = params.ReplacementContent || params.replacementContent || params.CodeContent || params.codeContent;
          const patchInput = params.patch || params.diff;

          const { patch, addedLines, deletedLines, diffLines } = parseOrGenerateDiff(
            patchInput,
            targetContent,
            replacementContent,
            params.addedLines,
            params.deletedLines
          );

          return {
            type: 'TOOL_FILE_EDIT',
            content: `✏️ Edited ${targetFile} (+${addedLines} lines, -${deletedLines} lines)`,
            metadata: { toolName, targetFile, filePath: targetFile, addedLines, deletedLines, patch, diffLines, toolArgs: params, raw: json },
          };
        }

        // Command / General Tool Call (run_command)
        const cmd = params.CommandLine || params.command || toolName;
        return {
          type: 'TOOL_CALL',
          content: `Tool Call [${toolName}]: ${cmd}`,
          metadata: { toolName, toolArgs: params, raw: json },
        };
      }

      if (stepType === 'agent_response') {
        const textDelta = su.text_delta || su.delta || su.content || su.text;
        if (textDelta) {
          return {
            type: 'TEXT',
            content: String(textDelta),
            metadata: { raw: json },
          };
        }
        if (su.usage && su.usage.thinking_tokens > 0) {
          return {
            type: 'THOUGHT',
            content: `> _Multi-step reasoning (${su.usage.thinking_tokens} tokens)_`,
            metadata: { raw: json },
          };
        }
        return {
          type: 'TEXT',
          content: '',
          metadata: { raw: json },
        };
      }

      return {
        type: 'TEXT',
        content: '',
        metadata: { raw: json },
      };
    }

    const eventTypeStr = String(
      json.type || json.event || json.kind || json.action || json.status || ''
    ).toLowerCase();
    const toolNameRaw = String(
      json.toolName || json.tool_name || json.tool || json.name || ''
    ).toLowerCase();

    // SUBAGENT_SPAWNED
    if (
      eventTypeStr === 'subagent_spawned' ||
      eventTypeStr === 'subagent_spawn' ||
      eventTypeStr === 'subagent_start' ||
      (json.subagentId && (json.action === 'spawn' || json.action === 'start' || json.event === 'spawned'))
    ) {
      const subagentId = json.subagentId || json.subagent_id || json.id || `subagent-${Date.now()}`;
      const taskDescription = json.taskDescription || json.task || json.description || json.message || 'Background reasoning task';
      const activeTool = json.activeTool || json.toolName || json.tool;

      const workerState: SubagentWorkerState = {
        id: subagentId,
        taskDescription,
        status: 'running',
        activeTool,
        progress: json.progress || 0,
        outputLogs: [json.message || `Subagent ${subagentId} spawned for task: ${taskDescription}`],
      };
      this.subagentsMap.set(subagentId, workerState);

      return {
        type: 'SUBAGENT_SPAWNED',
        content: `🤖 [Subagent ${subagentId}] Spawned: ${taskDescription}`,
        metadata: {
          subagentId,
          taskDescription,
          activeTool,
          status: 'running',
          progress: workerState.progress,
          outputLogs: workerState.outputLogs,
          raw: json,
        },
      };
    }

    // SUBAGENT_PROGRESS
    if (
      eventTypeStr === 'subagent_progress' ||
      eventTypeStr === 'subagent_update' ||
      (json.subagentId && (json.progress !== undefined || json.activeTool || json.log))
    ) {
      const subagentId = json.subagentId || json.subagent_id || json.id;
      const existing: SubagentWorkerState = this.subagentsMap.get(subagentId) || {
        id: subagentId,
        taskDescription: json.taskDescription || json.task || 'Background task',
        status: 'running',
        outputLogs: [],
      };

      if (json.activeTool || json.toolName || json.tool) {
        existing.activeTool = json.activeTool || json.toolName || json.tool;
      }
      if (json.progress !== undefined) {
        existing.progress = json.progress;
      }
      if (json.log || json.message || json.output) {
        existing.outputLogs.push(json.log || json.message || json.output);
      }
      existing.status = json.status || existing.status;
      this.subagentsMap.set(subagentId, existing);

      return {
        type: 'SUBAGENT_PROGRESS',
        content: `🤖 [Subagent ${subagentId}] ${existing.activeTool ? `Tool: ${existing.activeTool}` : 'Progressing...'}`,
        metadata: {
          subagentId,
          taskDescription: existing.taskDescription,
          activeTool: existing.activeTool,
          status: existing.status,
          progress: existing.progress,
          outputLogs: existing.outputLogs,
          raw: json,
        },
      };
    }

    // SUBAGENT_COMPLETED
    if (
      eventTypeStr === 'subagent_completed' ||
      eventTypeStr === 'subagent_done' ||
      eventTypeStr === 'subagent_finish' ||
      (json.subagentId && (json.action === 'complete' || json.action === 'done' || json.status === 'completed'))
    ) {
      const subagentId = json.subagentId || json.subagent_id || json.id;
      const existing: SubagentWorkerState = this.subagentsMap.get(subagentId) || {
        id: subagentId,
        taskDescription: json.taskDescription || json.task || 'Background task',
        status: 'completed',
        outputLogs: [],
      };

      existing.status = json.status === 'failed' ? 'failed' : 'completed';
      existing.progress = 100;
      if (json.result || json.message) {
        existing.outputLogs.push(json.result || json.message);
      }
      this.subagentsMap.set(subagentId, existing);

      return {
        type: 'SUBAGENT_COMPLETED',
        content: `✓ [Subagent ${subagentId}] Completed task: ${existing.taskDescription}`,
        metadata: {
          subagentId,
          taskDescription: existing.taskDescription,
          status: existing.status,
          progress: 100,
          outputLogs: existing.outputLogs,
          raw: json,
        },
      };
    }

    // TOOL_ANALYSIS (file reading, searching, listing)
    if (
      eventTypeStr === 'tool_analysis' ||
      eventTypeStr === 'file_read' ||
      toolNameRaw === 'view_file' ||
      toolNameRaw === 'viewfile' ||
      toolNameRaw === 'grep_search' ||
      toolNameRaw === 'grepsearch' ||
      toolNameRaw === 'list_directory' ||
      toolNameRaw === 'list_dir' ||
      toolNameRaw === 'listdir' ||
      toolNameRaw === 'search_web' ||
      toolNameRaw === 'web_search'
    ) {
      const toolName = json.toolName || json.tool_name || json.tool || toolNameRaw || 'view_file';
      const filePath = json.filePath || json.file_path || json.file || json.path || json.AbsolutePath || json.targetFile;
      const startLine = json.startLine ?? json.StartLine ?? json.start_line;
      const endLine = json.endLine ?? json.EndLine ?? json.end_line;
      let lineRange = json.lineRange || json.line_range;
      if (!lineRange && (startLine !== undefined || endLine !== undefined)) {
        lineRange = startLine !== undefined && endLine !== undefined ? `lines ${startLine}–${endLine}` : `line ${startLine}+`;
      }
      const query = json.query || json.Query || json.search_path || json.term;

      let content = json.content;
      if (!content) {
        if (toolName.includes('grep') || toolName.includes('search')) {
          content = `🔎 Searched workspace for "${query || ''}"`;
        } else if (toolName.includes('list')) {
          content = `📁 Listed directory ${filePath || 'workspace'}`;
        } else {
          content = `🔍 Analyzed ${filePath || 'file'}${lineRange ? ` (${lineRange})` : ''}`;
        }
      }

      return {
        type: 'TOOL_ANALYSIS',
        content,
        metadata: {
          toolName,
          filePath,
          startLine,
          endLine,
          lineRange,
          query,
          toolArgs: json.toolArgs || json.args || json.parameters || json,
          raw: json,
        },
      };
    }

    // TOOL_FILE_EDIT (file modifications, edits, writes)
    if (
      eventTypeStr === 'tool_file_edit' ||
      eventTypeStr === 'file_edit' ||
      eventTypeStr === 'file_modification' ||
      toolNameRaw === 'edit_file' ||
      toolNameRaw === 'editfile' ||
      toolNameRaw === 'write_file' ||
      toolNameRaw === 'writefile' ||
      toolNameRaw === 'replace_file' ||
      toolNameRaw === 'replacefile' ||
      toolNameRaw === 'write_to_file' ||
      toolNameRaw === 'replace_file_content' ||
      toolNameRaw === 'multi_replace_file_content'
    ) {
      const toolName = json.toolName || json.tool_name || json.tool || toolNameRaw || 'edit_file';
      const targetFile = json.targetFile || json.TargetFile || json.filePath || json.file_path || json.file || json.path || 'file';
      const targetContent = json.TargetContent || json.targetContent;
      const replacementContent = json.ReplacementContent || json.replacementContent || json.CodeContent || json.codeContent;
      const patchInput = json.patch || json.diff;

      const { patch, addedLines, deletedLines, diffLines } = parseOrGenerateDiff(
        patchInput,
        targetContent,
        replacementContent,
        json.addedLines || json.additions,
        json.deletedLines || json.deletions
      );

      const content = json.content || `✏️ Edited ${targetFile} (+${addedLines} lines, -${deletedLines} lines)`;

      return {
        type: 'TOOL_FILE_EDIT',
        content,
        metadata: {
          toolName,
          targetFile,
          filePath: targetFile,
          addedLines,
          deletedLines,
          patch,
          diffLines,
          toolArgs: json.toolArgs || json.args || json.parameters || json,
          raw: json,
        },
      };
    }

    // THOUGHT
    if (
      eventTypeStr === 'thought' ||
      eventTypeStr === 'thinking' ||
      eventTypeStr === 'reasoning' ||
      eventTypeStr === 'thought_chunk' ||
      json.thought !== undefined ||
      json.thinking !== undefined
    ) {
      const rawThought = json.content || json.thought || json.thinking || json.message || '';
      const formattedThought = rawThought.startsWith('>') ? rawThought : `> _${rawThought}_`;

      return {
        type: 'THOUGHT',
        content: formattedThought,
        metadata: { rawThought, raw: json },
      };
    }

    // TOOL_CALL (other tools, e.g. run_command)
    if (
      eventTypeStr === 'tool_call' ||
      eventTypeStr === 'tool_use' ||
      eventTypeStr === 'tool_request' ||
      eventTypeStr === 'tool_execution' ||
      eventTypeStr === 'tool' ||
      json.toolName ||
      json.tool_name ||
      json.tool
    ) {
      const toolName = json.toolName || json.tool_name || json.tool || 'unknown_tool';
      const toolArgs = json.toolArgs || json.args || json.input || json.parameters || {};
      return {
        type: 'TOOL_CALL',
        content: json.content || `Tool Call: ${toolName}`,
        metadata: { toolName, toolArgs, raw: json },
      };
    }

    // FILE_CHANGE
    if (
      eventTypeStr === 'file_change' ||
      eventTypeStr === 'file_mutation' ||
      eventTypeStr === 'file_create' ||
      eventTypeStr === 'file_delete'
    ) {
      const filePath = json.filePath || json.file_path || json.file || json.path;
      let changeType: 'created' | 'modified' | 'deleted' = 'modified';
      if (eventTypeStr.includes('create') || json.action === 'created') changeType = 'created';
      if (eventTypeStr.includes('delete') || json.action === 'deleted') changeType = 'deleted';

      return {
        type: 'FILE_CHANGE',
        content: json.content || `File Change [${changeType}]: ${filePath}`,
        metadata: { filePath, changeType, raw: json },
      };
    }

    // ERROR
    if (
      eventTypeStr === 'error' ||
      eventTypeStr === 'err' ||
      eventTypeStr === 'exception' ||
      eventTypeStr === 'failure' ||
      json.error !== undefined
    ) {
      const errorMsg = json.error || json.message || '';
      let errorCode = json.errorCode || json.code || 'AGY_ERROR';
      const errStr = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
      if (errStr.includes('Eligibility check failed') || errStr.includes('i/o timeout')) {
        errorCode = 'NETWORK_ELIGIBILITY_ERROR';
      }
      return {
        type: 'ERROR',
        content: errStr,
        metadata: { errorCode, raw: json },
      };
    }

    // COMPLETION
    if (eventTypeStr === 'completion' || eventTypeStr === 'done' || eventTypeStr === 'finished') {
      return {
        type: 'COMPLETION',
        content: json.content || json.message || '',
        metadata: { raw: json },
      };
    }

    return {
      type: 'TEXT',
      content: json.content || json.text || json.text_delta || json.delta || '',
      metadata: { raw: json },
    };
  }

  private parseLineInternal(line: string): AntigravityParsedEvent {
    const trimmed = line.trim();
    if (!trimmed) {
      return { type: 'TEXT', content: '' };
    }

    // 1. Try parsing JSON stream event
    if (trimmed.startsWith('{')) {
      const json = tryParseJsonWithExtraBraces(trimmed);
      if (json) {
        return this.parseJsonObject(json);
      }
    }

    // 2. Plain Text / Stream Line parsing

    // SUBAGENT_SPAWNED plain text pattern
    if (trimmed.startsWith('[SUBAGENT_SPAWNED]') || trimmed.toLowerCase().startsWith('subagent spawned:')) {
      const clean = trimmed.replace(/^\[SUBAGENT_SPAWNED\]\s*/i, '').replace(/^subagent spawned:\s*/i, '');
      const parts = clean.split(/\s+-\s+/);
      const subagentId = parts[0]?.trim() || `subagent-${Date.now()}`;
      const taskDescription = parts[1]?.trim() || parts[0]?.trim() || 'Background worker task';

      const workerState: SubagentWorkerState = {
        id: subagentId,
        taskDescription,
        status: 'running',
        progress: 0,
        outputLogs: [trimmed],
      };
      this.subagentsMap.set(subagentId, workerState);

      return {
        type: 'SUBAGENT_SPAWNED',
        content: `🤖 [Subagent ${subagentId}] Spawned: ${taskDescription}`,
        metadata: { subagentId, taskDescription, status: 'running', outputLogs: workerState.outputLogs },
      };
    }

    // SUBAGENT_PROGRESS plain text pattern
    if (trimmed.startsWith('[SUBAGENT_PROGRESS]') || trimmed.toLowerCase().startsWith('subagent progress:')) {
      const clean = trimmed.replace(/^\[SUBAGENT_PROGRESS\]\s*/i, '').replace(/^subagent progress:\s*/i, '');
      const match = clean.match(/^([a-zA-Z0-9_-]+)\s+(.+)$/);
      const subagentId = match ? match[1] : 'subagent-1';
      const logText = match ? match[2] : clean;

      const existing: SubagentWorkerState = this.subagentsMap.get(subagentId) || {
        id: subagentId,
        taskDescription: 'Background worker task',
        status: 'running',
        outputLogs: [],
      };
      existing.outputLogs.push(logText);
      this.subagentsMap.set(subagentId, existing);

      return {
        type: 'SUBAGENT_PROGRESS',
        content: `🤖 [Subagent ${subagentId}] ${logText}`,
        metadata: { subagentId, taskDescription: existing.taskDescription, status: existing.status, outputLogs: existing.outputLogs },
      };
    }

    // SUBAGENT_COMPLETED plain text pattern
    if (trimmed.startsWith('[SUBAGENT_COMPLETED]') || trimmed.toLowerCase().startsWith('subagent completed:')) {
      const clean = trimmed.replace(/^\[SUBAGENT_COMPLETED\]\s*/i, '').replace(/^subagent completed:\s*/i, '');
      const subagentId = clean.trim().split(/\s+/)[0] || 'subagent-1';

      const existing: SubagentWorkerState = this.subagentsMap.get(subagentId) || {
        id: subagentId,
        taskDescription: 'Background worker task',
        status: 'completed',
        outputLogs: [],
      };
      existing.status = 'completed';
      existing.progress = 100;
      this.subagentsMap.set(subagentId, existing);

      return {
        type: 'SUBAGENT_COMPLETED',
        content: `✓ [Subagent ${subagentId}] Completed`,
        metadata: { subagentId, taskDescription: existing.taskDescription, status: 'completed', progress: 100 },
      };
    }

    // TOOL_ANALYSIS plain text pattern
    if (
      trimmed.startsWith('[TOOL_ANALYSIS]') ||
      trimmed.startsWith('🔍') ||
      trimmed.startsWith('🔎') ||
      trimmed.startsWith('📁') ||
      trimmed.toLowerCase().startsWith('analyzed ') ||
      trimmed.toLowerCase().startsWith('searched ') ||
      trimmed.toLowerCase().startsWith('view_file') ||
      trimmed.toLowerCase().startsWith('grep_search') ||
      trimmed.toLowerCase().startsWith('list_directory')
    ) {
      const clean = trimmed.replace(/^\[TOOL_ANALYSIS\]\s*/i, '');
      let toolName = 'view_file';
      let filePath: string | undefined;
      let lineRange: string | undefined;
      let query: string | undefined;

      if (clean.includes('Searched') || clean.includes('grep_search')) {
        toolName = 'grep_search';
        const qMatch = clean.match(/(?:for\s*"([^"]+)"|"([^"]+)"|grep_search\s+([^\s]+))/i);
        query = qMatch ? (qMatch[1] || qMatch[2] || qMatch[3]) : undefined;
      } else if (clean.includes('Listed') || clean.includes('list_directory')) {
        toolName = 'list_directory';
        const fMatch = clean.match(/(?:directory\s+([^\s]+)|list_directory\s+([^\s]+))/i);
        filePath = fMatch ? (fMatch[1] || fMatch[2]) : undefined;
      } else {
        toolName = 'view_file';
        const fMatch = clean.match(/(?:Analyzed\s+([^\s\()]+)|view_file\s+([^\s\()]+))/i);
        filePath = fMatch ? (fMatch[1] || fMatch[2]) : undefined;
        const rMatch = clean.match(/\((lines [^\)]+)\)/i);
        lineRange = rMatch ? rMatch[1] : undefined;
      }

      return {
        type: 'TOOL_ANALYSIS',
        content: clean,
        metadata: { toolName, filePath, lineRange, query },
      };
    }

    // TOOL_FILE_EDIT plain text pattern
    if (
      trimmed.startsWith('[TOOL_FILE_EDIT]') ||
      trimmed.startsWith('✏️') ||
      trimmed.toLowerCase().startsWith('edited ') ||
      trimmed.toLowerCase().startsWith('replace_file') ||
      trimmed.toLowerCase().startsWith('write_file') ||
      trimmed.toLowerCase().startsWith('edit_file')
    ) {
      const clean = trimmed.replace(/^\[TOOL_FILE_EDIT\]\s*/i, '');
      const fMatch = clean.match(/(?:Edited\s+([^\s\()]+)|replace_file\s+([^\s]+)|write_file\s+([^\s]+)|edit_file\s+([^\s]+))/i);
      const targetFile = fMatch ? (fMatch[1] || fMatch[2] || fMatch[3] || fMatch[4]) : 'file';

      const addMatch = clean.match(/\+(\d+)\s*lines?/i);
      const delMatch = clean.match(/\-(\d+)\s*lines?/i);
      const addedLines = addMatch ? parseInt(addMatch[1], 10) : 0;
      const deletedLines = delMatch ? parseInt(delMatch[1], 10) : 0;

      return {
        type: 'TOOL_FILE_EDIT',
        content: clean,
        metadata: { toolName: 'edit_file', targetFile, filePath: targetFile, addedLines, deletedLines },
      };
    }

    // THOUGHT plain text pattern
    if (
      trimmed.startsWith('[THOUGHT]') ||
      trimmed.toLowerCase().startsWith('thought:') ||
      trimmed.toLowerCase().startsWith('thinking:') ||
      trimmed.startsWith('●') ||
      trimmed.startsWith('⎿') ||
      trimmed.startsWith('I will ') ||
      trimmed.startsWith('I am ') ||
      trimmed.startsWith('I have ') ||
      trimmed.startsWith('Analyzing ')
    ) {
      const clean = trimmed.replace(/^\[THOUGHT\]\s*/i, '').replace(/^(thought|thinking|reasoning):\s*/i, '');
      const formattedThought = clean.startsWith('>') ? clean : `> _${clean}_`;
      return { type: 'THOUGHT', content: formattedThought, metadata: { rawThought: clean } };
    }

    // TOOL_CALL patterns
    if (
      trimmed.startsWith('[TOOL_CALL]') ||
      trimmed.toLowerCase().startsWith('tool call:') ||
      trimmed.toLowerCase().startsWith('calling tool:') ||
      trimmed.toLowerCase().startsWith('executing:') ||
      trimmed.toLowerCase().startsWith('executing command:') ||
      trimmed.toLowerCase().startsWith('executing command') ||
      trimmed.toLowerCase().startsWith('running tool:')
    ) {
      const toolMatch = trimmed.match(/(?:tool call|calling tool|executing command|executing|running tool|tool):\s*([a-zA-Z0-9_-]+)/i);
      const toolName = toolMatch ? toolMatch[1] : 'unknown_tool';
      return {
        type: 'TOOL_CALL',
        content: trimmed,
        metadata: { toolName },
      };
    }

    // FILE_CHANGE patterns
    if (
      trimmed.startsWith('[FILE_CHANGE]') ||
      trimmed.toLowerCase().startsWith('file changed:') ||
      trimmed.toLowerCase().startsWith('created file:') ||
      trimmed.toLowerCase().startsWith('modified file:') ||
      trimmed.toLowerCase().startsWith('deleted file:') ||
      trimmed.toLowerCase().startsWith('writing file:')
    ) {
      const fileMatch = trimmed.match(/(?:file changed|created file|modified file|deleted file|writing file|file):\s*([^\s]+)/i);
      const filePath = fileMatch ? fileMatch[1] : undefined;
      let changeType: 'created' | 'modified' | 'deleted' = 'modified';
      if (trimmed.toLowerCase().includes('created')) changeType = 'created';
      if (trimmed.toLowerCase().includes('deleted')) changeType = 'deleted';

      return {
        type: 'FILE_CHANGE',
        content: trimmed,
        metadata: { filePath, changeType },
      };
    }

    // ERROR patterns & jetski permission notices
    if (
      trimmed.startsWith('jetski:') ||
      trimmed.includes('User denied permission') ||
      trimmed.includes('no output produced — a tool required')
    ) {
      return {
        type: 'ERROR',
        content: `⚠️ Permission Error: ${trimmed}`,
        metadata: { errorCode: 'PERMISSION_REQUIRED' },
      };
    }

    if (
      trimmed.startsWith('[ERROR]') ||
      trimmed.startsWith('Error:') ||
      trimmed.startsWith('ERR:') ||
      trimmed.startsWith('Exception:')
    ) {
      let errorCode = 'AGY_ERROR';
      if (trimmed.includes('Eligibility check failed') || trimmed.includes('i/o timeout')) {
        errorCode = 'NETWORK_ELIGIBILITY_ERROR';
      }
      return {
        type: 'ERROR',
        content: trimmed,
        metadata: { errorCode },
      };
    }

    if (trimmed.includes('[AGY_DONE]') || trimmed.includes('[AGY_COMPLETE]')) {
      return { type: 'COMPLETION', content: line };
    }

    return { type: 'TEXT', content: line };
  }

  private emitParsedEvent(ev: AntigravityParsedEvent): void {
    if (!ev) return;
    this.emit('event', ev);
    if (ev.type === 'TEXT' && ev.content) {
      this.emit('text_delta', ev.content);
    } else if (ev.type === 'THOUGHT' && ev.content) {
      this.emit('thought', ev.content);
    } else if (ev.type === 'TOOL_CALL' || ev.type === 'TOOL_ANALYSIS' || ev.type === 'TOOL_FILE_EDIT') {
      const toolName = String(ev.metadata?.toolName || 'tool').toLowerCase();
      const toolArgs = (ev.metadata?.toolArgs || {}) as any;
      const filePath = ev.metadata?.filePath || ev.metadata?.targetFile || toolArgs.SearchPath || toolArgs.AbsolutePath;
      const query = ev.metadata?.query || toolArgs.Query;

      let formattedText = `• Executing: ${toolName}`;
      if (toolName.includes('list')) {
        formattedText = `• ListDir(${filePath || 'workspace'})`;
      } else if (toolName.includes('view') || toolName.includes('read')) {
        formattedText = `• Read(${filePath || 'file'})`;
      } else if (toolName.includes('grep') || toolName.includes('search')) {
        formattedText = `• Search("${query || ''}")`;
      } else if (toolName.includes('write') || toolName.includes('edit') || toolName.includes('replace')) {
        formattedText = `• Edit(${filePath || 'file'})`;
      } else if (ev.content) {
        formattedText = `• ${ev.content.replace(/^\[TOOL_\w+\]\s*/i, '').replace(/^[✏️🔍🔎📁]\s*/i, '')}`;
      }

      this.emit('tool_use', {
        name: toolName,
        content: formattedText,
        filePath,
        query,
      });
    } else if (ev.type === 'COMPLETION') {
      this.emit('step_complete', ev.content);
    }
  }

  /**
   * Parse a raw chunk of stream data (which may contain multiple lines).
   */
  public parseChunk(chunk: string): AntigravityParsedEvent[] {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() ?? '';

    const events: AntigravityParsedEvent[] = [];
    for (const line of lines) {
      if (line.trim()) {
        const ev = this.parseLine(line);
        if (ev) {
          events.push(ev);
          this.emitParsedEvent(ev);
        }
      }
    }
    return events;
  }

  public flush(): AntigravityParsedEvent[] {
    if (this.buffer.trim()) {
      const line = this.buffer;
      this.buffer = '';
      const evs = [this.parseLine(line)];
      evs.forEach((e) => this.emitParsedEvent(e));
      return evs;
    }
    return [];
  }

  public reset(): void {
    this.buffer = '';
    this.lastEmittedEvent = null;
    this.subagentsMap.clear();
  }
}
