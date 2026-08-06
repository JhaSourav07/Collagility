import type { RiskLevel } from '@collagility/protocol';

/**
 * Evaluates the risk level of a shell command or tool invocation.
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
    /\brm\s+-[a-z]*r[a-z]*f\b/i,             // rm -rf / rm -fr
    /\brm\s+-[a-z]*f[a-z]*r\b/i,
    /\brm\s+-[a-z]*f\b/i,                   // rm -f
    /\brm\s+-[a-z]*r\b/i,                   // rm -r
    /\b(sudo|su|chmod|chown|chgrp)\b/i,      // Privilege & permission escalation
    /\b(kill|pkill|killall)\b/i,            // Process termination
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

  // Fallback for general run_command / shell executions
  return 'MEDIUM';
}
