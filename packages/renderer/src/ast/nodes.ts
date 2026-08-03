export type NodeType =
  | 'document'
  | 'heading'
  | 'paragraph'
  | 'text'
  | 'code_block'
  | 'list'
  | 'list_item'
  | 'task_list'
  | 'block_quote'
  | 'horizontal_rule'
  | 'table'
  | 'link'
  | 'image'
  | 'callout'
  | 'badge'
  | 'status'
  | 'file'
  | 'tool_action'
  | 'thought';

export interface ToolActionNode extends BaseNode {
  type: 'tool_action';
  name: 'Read' | 'Search' | 'Edit' | 'Write' | 'Delete' | 'Grep' | 'Create' | 'Rename' | string;
  target?: string;
  state: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  outputSummary?: string;
}

export interface ThoughtNode extends BaseNode {
  type: 'thought';
  durationSeconds?: number;
  summaryText: string;
}



export interface CalloutNode extends BaseNode {
  type: 'callout';
  calloutType: 'note' | 'tip' | 'important' | 'warning' | 'caution';
  text: string;
}

export interface BadgeNode extends BaseNode {
  type: 'badge';
  label: string;
  variant?: 'owner' | 'visitor' | 'model' | 'status' | 'info';
}

export interface StatusNode extends BaseNode {
  type: 'status';
  state: 'connected' | 'disconnected' | 'syncing' | 'error';
  message: string;
}

export interface FileNode extends BaseNode {
  type: 'file';
  fileName: string;
  filePath?: string;
  lineRange?: string;
}

export interface BaseNode {
  type: NodeType;
  id?: string;
  metadata?: Record<string, unknown>;
}

export interface TextNode extends BaseNode {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  strikethrough?: boolean;
}

export type InlineNode = TextNode | LinkNode;

export interface HeadingNode extends BaseNode {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  children?: InlineNode[];
}

export interface ParagraphNode extends BaseNode {
  type: 'paragraph';
  children: InlineNode[];
}

export interface CodeBlockNode extends BaseNode {
  type: 'code_block';
  language?: string;
  code: string;
}

export interface ListItemNode extends BaseNode {
  type: 'list_item';
  text: string;
  children?: InlineNode[];
  checked?: boolean; // For task list items
}

export interface ListNode extends BaseNode {
  type: 'list';
  ordered: boolean;
  start?: number;
  items: ListItemNode[];
}

export interface TaskListItem {
  text: string;
  checked: boolean;
}

export interface TaskListNode extends BaseNode {
  type: 'task_list';
  items: TaskListItem[];
}

export interface BlockQuoteNode extends BaseNode {
  type: 'block_quote';
  children: ASTNode[];
}

export interface HorizontalRuleNode extends BaseNode {
  type: 'horizontal_rule';
}

export interface TableNode extends BaseNode {
  type: 'table';
  headers: string[];
  alignments?: Array<'left' | 'center' | 'right'>;
  rows: string[][];
}

export interface LinkNode extends BaseNode {
  type: 'link';
  text: string;
  url: string;
  isFileRef?: boolean;
  filePath?: string;
}

export interface ImageNode extends BaseNode {
  type: 'image';
  alt: string;
  url: string;
}

export interface DocumentNode extends BaseNode {
  type: 'document';
  children: ASTNode[];
}

export type ASTNode =
  | DocumentNode
  | HeadingNode
  | ParagraphNode
  | TextNode
  | CodeBlockNode
  | ListNode
  | ListItemNode
  | TaskListNode
  | BlockQuoteNode
  | HorizontalRuleNode
  | TableNode
  | LinkNode
  | ImageNode
  | CalloutNode
  | BadgeNode
  | StatusNode
  | FileNode
  | ToolActionNode
  | ThoughtNode;
