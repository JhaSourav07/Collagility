import type { FileNode } from '../ast/nodes.js';
import type { ComponentContext, ComponentDimensions, RenderComponent } from './base.js';
import { measureComponentText } from './base.js';
import { ProjectFileDetector } from '../utils/file-detector.js';

export class FileComponent implements RenderComponent<FileNode> {
  public render(node: FileNode, context: ComponentContext): string {
    const { formatter } = context;
    const name = node.fileName || 'file.ts';
    const metadata = ProjectFileDetector.parseFileMetadata(node.filePath || name);
    const range = node.lineRange || metadata.lineRange ? `:${node.lineRange || metadata.lineRange}` : '';
    const color = metadata.isDoc ? '#38bdf8' : '#60a5fa';

    return `${formatter.colorHex(color, `${metadata.icon}${metadata.fileName}${range}`)}`;
  }

  public measure(node: FileNode, context: ComponentContext): ComponentDimensions {
    return measureComponentText(this.render(node, context));
  }

  public update(node: FileNode, delta?: Partial<FileNode>): FileNode {
    return { ...node, ...delta };
  }
}
