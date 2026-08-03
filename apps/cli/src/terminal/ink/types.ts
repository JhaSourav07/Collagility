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
}

export interface AIDriverState {
  name: string;
  model: string;
  mode: string;
  status: string;
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
