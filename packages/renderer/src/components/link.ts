import type { LinkNode, ImageNode } from '../ast/nodes.js';
import type { ComponentContext, RenderComponent } from './base.js';

export class LinkComponent implements RenderComponent<LinkNode> {
  public render(node: LinkNode, context: ComponentContext): string {
    const { formatter } = context;
    if (node.isFileRef) {
      return formatter.fileRef(node.text || node.filePath || node.url);
    }
    return formatter.webLink(node.text || node.url, node.url);
  }
}

export class ImageComponent implements RenderComponent<ImageNode> {
  public render(node: ImageNode, context: ComponentContext): string {
    const { formatter } = context;
    return formatter.dim(`🖼️ [Image: ${node.alt || 'Untitled'} (${node.url})]`);
  }
}
