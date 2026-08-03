import type { DocumentNode, ASTNode, HeadingNode, ParagraphNode, CodeBlockNode, ListNode, TableNode } from '../ast/nodes.js';

export class DocumentModel {
  public root: DocumentNode;

  constructor(children: ASTNode[] = []) {
    this.root = {
      type: 'document',
      children,
    };
  }

  public getChildren(): ASTNode[] {
    return this.root.children;
  }

  public addChild(node: ASTNode): void {
    this.root.children.push(node);
  }

  public findHeadings(): HeadingNode[] {
    return this.root.children.filter((n): n is HeadingNode => n.type === 'heading');
  }

  public findCodeBlocks(): CodeBlockNode[] {
    return this.root.children.filter((n): n is CodeBlockNode => n.type === 'code_block');
  }

  public findTables(): TableNode[] {
    return this.root.children.filter((n): n is TableNode => n.type === 'table');
  }

  public findParagraphs(): ParagraphNode[] {
    return this.root.children.filter((n): n is ParagraphNode => n.type === 'paragraph');
  }

  public findLists(): ListNode[] {
    return this.root.children.filter((n): n is ListNode => n.type === 'list');
  }

  public toJSON(): object {
    return this.root;
  }
}
