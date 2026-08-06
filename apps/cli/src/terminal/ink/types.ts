import type { PermissionRequest, PermissionDecision, SecurityMode } from '@collagility/protocol';

export interface UserMember {
  name: string;
  isOwner?: boolean;
  isSelf?: boolean;
}

export interface SessionInfoState {
  id: string;
  ownerName: string;
  createdAgo: string;
  userRole: 'owner' | 'visitor';
  users: UserMember[];
  workspacePath?: string;
  version?: string;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';
}

export interface TokenStatus {
  used: number;
  limit: number;
}

export interface AIDriverState {
  name: string;
  model: string;
  mode: string;
  status: string;
  securityMode?: SecurityMode;
  tokenStatus?: TokenStatus;
}

export interface SubagentTask {
  id: string;
  name: string;
  target: string;
  status: 'running' | 'idle' | 'completed' | 'failed';
  runtime: string;
  progress?: number;
}

export type OverlayType = 'none' | 'config' | 'permissions' | 'agents' | 'resume' | 'mcp';

export interface ToolExecutionCard {
  toolName: string;
  params?: Record<string, unknown>;
  status: 'running' | 'success' | 'failed';
  output?: string;
}

export interface FileEditCard {
  filePath: string;
  additions: number;
  deletions: number;
  diffSummary?: string;
}

export interface ChatMessageItem {
  id: string;
  timestamp: string;
  sender: string;
  senderRole: 'system' | 'user' | 'ai';
  content: string;
  icon?: string;
  isStreaming?: boolean;
  isTyping?: boolean;
  thoughtBlock?: string;
  toolCard?: ToolExecutionCard;
  fileEditCard?: FileEditCard;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  text: string;
  type: 'join' | 'leave' | 'typing' | 'session' | 'info';
}

export interface InteractiveOption {
  key: string;
  label: string;
}

export interface InteractivePromptState {
  id: string;
  type: 'plan' | 'question' | 'confirmation' | 'selection';
  title: string;
  options: InteractiveOption[];
  rawContent?: string;
  filePath?: string;
}

export type CommandHandler = (commandOrMessage: string) => void;

export interface PermissionPromptState {
  id: string;
  request: PermissionRequest;
  onResolve: (decision: PermissionDecision) => void;
}
