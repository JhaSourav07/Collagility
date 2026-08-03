export type TokenType =
  | 'heading'
  | 'paragraph'
  | 'code_block'
  | 'bullet_item'
  | 'numbered_item'
  | 'task_item'
  | 'quote'
  | 'hr'
  | 'table_row'
  | 'text_line';

export interface Token {
  type: TokenType;
  content: string;
  level?: number;
  language?: string;
  ordered?: boolean;
  checked?: boolean;
  raw?: string;
}
