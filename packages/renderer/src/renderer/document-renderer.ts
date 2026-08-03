import type { ASTNode, DocumentNode } from '../ast/nodes.js';
import type { RenderTheme } from '../theme/theme.js';
import { getTheme } from '../theme/theme.js';
import { ANSIFormatter } from '../ansi/formatter.js';
import type { ComponentContext } from '../components/base.js';
import { HeadingComponent } from '../components/heading.js';
import { ParagraphComponent } from '../components/paragraph.js';
import { CodeBlockComponent } from '../components/code-block.js';
import { ListComponent, TaskListComponent } from '../components/list.js';
import { QuoteComponent } from '../components/quote.js';
import { HorizontalRuleComponent } from '../components/divider.js';
import { TableComponent } from '../components/table.js';
import { LinkComponent, ImageComponent } from '../components/link.js';
import { MarkdownParser } from '../parser/parser.js';
import { DocumentModel } from '../document/document-model.js';

export interface DocumentRendererOptions {
  maxWidth?: number;
  theme?: string | RenderTheme;
}

export class DocumentRenderer {
  private options: Required<DocumentRendererOptions>;
  private parser: MarkdownParser;
  private headingComp: HeadingComponent;
  private paragraphComp: ParagraphComponent;
  private codeBlockComp: CodeBlockComponent;
  private listComp: ListComponent;
  private taskListComp: TaskListComponent;
  private quoteComp: QuoteComponent;
  private hrComp: HorizontalRuleComponent;
  private tableComp: TableComponent;
  private linkComp: LinkComponent;
  private imageComp: ImageComponent;

  constructor(options: DocumentRendererOptions = {}) {
    this.options = {
      maxWidth: options.maxWidth || process.stdout.columns || 80,
      theme: getTheme(options.theme || 'dark'),
    };
    this.parser = new MarkdownParser();
    this.headingComp = new HeadingComponent();
    this.paragraphComp = new ParagraphComponent();
    this.codeBlockComp = new CodeBlockComponent();
    this.listComp = new ListComponent();
    this.taskListComp = new TaskListComponent();
    this.quoteComp = new QuoteComponent();
    this.hrComp = new HorizontalRuleComponent();
    this.tableComp = new TableComponent();
    this.linkComp = new LinkComponent();
    this.imageComp = new ImageComponent();
  }

  public renderMarkdown(markdown: string): string {
    const docAST = this.parser.parse(markdown);
    return this.renderDocument(docAST);
  }

  public renderDocumentModel(model: DocumentModel): string {
    return this.renderDocument(model.root);
  }

  public renderDocument(doc: DocumentNode): string {
    const context: ComponentContext = {
      maxWidth: this.options.maxWidth,
      theme: this.options.theme as RenderTheme,
      formatter: new ANSIFormatter(this.options.theme as RenderTheme),
    };

    return doc.children
      .map((node) => this.renderNode(node, context))
      .filter(Boolean)
      .join('\n\n');
  }

  public renderNode(node: ASTNode, context: ComponentContext): string {
    switch (node.type) {
      case 'heading':
        return this.headingComp.render(node, context);
      case 'paragraph':
        return this.paragraphComp.render(node, context);
      case 'code_block':
        return this.codeBlockComp.render(node, context);
      case 'list':
        return this.listComp.render(node, context);
      case 'task_list':
        return this.taskListComp.render(node, context);
      case 'block_quote':
        return this.quoteComp.render(node, context);
      case 'horizontal_rule':
        return this.hrComp.render(node, context);
      case 'table':
        return this.tableComp.render(node, context);
      case 'link':
        return this.linkComp.render(node, context);
      case 'image':
        return this.imageComp.render(node, context);
      default:
        return '';
    }
  }

  public setMaxWidth(width: number): void {
    this.options.maxWidth = width;
  }

  public setTheme(theme: string | RenderTheme): void {
    this.options.theme = getTheme(theme);
  }
}
