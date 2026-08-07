import type { RiskLevel } from '@collagility/protocol';

/**
 * Evaluates the risk level of a shell command or tool invocation.
 *
 * NOTE: This is heuristic pattern-matching on command text, not a secure sandbox
 * or execution guarantee. It can be bypassed by string obfuscation, command
 * substitution (e.g. `$(...)` or `` `...` ``), multi-step execution (e.g. downloading
 * a script in step 1 and running it in step 2), or unusual shell syntax/aliases.
 *
 * @param command - The CLI command string or tool invocation command
 * @param toolName - The name of the tool being executed (e.g. 'run_command', 'write_to_file', 'view_file')
 * @returns RiskLevel - 'LOW' | 'MEDIUM' | 'HIGH'
 */
export function evaluateRisk(command: string, toolName: string = 'run_command'): RiskLevel {
  const trimmedCmd = command.trim();
  const trimmedTool = toolName.trim();
  const lowerCmd = trimmedCmd.toLowerCase();
  const lowerTool = trimmedTool.toLowerCase();

  // 1. High Risk Check: Destructive commands, system privilege escalation, process manipulation, system path writes, piping remote scripts into shell
  const HIGH_RISK_PATTERNS = [
    /\brm\b(?=.*?\b(?:-[a-z]*[rR][a-z]*|--recursive)\b)(?=.*?\b(?:-[a-z]*f[a-z]*|--force)\b)/i, // rm with recursive (-r/-R/--recursive) and force (-f/--force) flags
    /\b(sudo|su|chmod|chown|chgrp)\b/i,      // Privilege & permission escalation (chmod -R / --recursive, chown, sudo)
    /\b(kill|pkill|killall)\b/i,            // Process termination (-9, -SIGKILL, --signal=KILL)
    /\b(dd|mkfs|format|fdisk)\b/i,           // Disk formatting/wiping
    />>\s*\/(etc|usr|var|boot|sys|proc)\b/i, // Direct system directory mutation
    /\b(curl|wget)\b.*\|\s*(sh|bash|zsh)\b/i, // Piping remote script directly to shell
    /\.\.\//,                               // Path traversal attempting to access parent dirs
  ];

  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(trimmedCmd))) {
    return 'HIGH';
  }

  if (
    lowerTool === 'delete_file' ||
    lowerTool === 'remove_file' ||
    lowerTool === 'execute_dangerous_command' ||
    lowerTool === 'system_admin'
  ) {
    return 'HIGH';
  }

  // 2. Read-Only Low Risk Check
  const LOW_RISK_TOOLS = [
    'view_file',
    'read_file',
    'list_dir',
    'ls',
    'read_url_content',
    'grep_search',
    'search_web',
    'ask_question',
    'schedule',
  ];

  if (LOW_RISK_TOOLS.includes(lowerTool)) {
    return 'LOW';
  }

  // Safe read-only CLI commands without redirect or pipe chaining
  const READ_ONLY_CMD_REGEX = /^\s*(ls|cat|head|tail|grep|rg|find|pwd|git\s+(status|log|diff|show|branch)|echo|which|where|node\s+--version|npm\s+--version|pnpm\s+--version|yarn\s+--version)\b/i;

  if (READ_ONLY_CMD_REGEX.test(trimmedCmd) && !/[><|;&]/.test(trimmedCmd)) {
    return 'LOW';
  }

  // 3. Medium Risk Check: Safe file modifications, directory creation, safe package management
  const MEDIUM_RISK_TOOLS = [
    'write_to_file',
    'replace_file_content',
    'multi_replace_file_content',
    'create_file',
    'edit_file',
    'apply_patch',
  ];

  if (MEDIUM_RISK_TOOLS.includes(lowerTool)) {
    return 'MEDIUM';
  }

  const SAFE_MUTATION_CMD_REGEX = /^\s*(mkdir|touch|cp|mv|npm\s+(install|i|add|run|test|build)|pnpm\s+(install|add|test|build)|yarn\s+(add|test|build)|git\s+(checkout|commit|add|pull|fetch))\b/i;

  if (SAFE_MUTATION_CMD_REGEX.test(trimmedCmd)) {
    return 'MEDIUM';
  }

  // Fallback for unrecognized tools / general shell executions
  return 'HIGH';
}
