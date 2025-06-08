import { FileNode } from '../entities/FileNode';
import { FileChange } from '../entities/FileChange';

export class FileTreeService {
  buildFileTreeWithChanges(
    baseTree: FileNode,
    changes: FileChange[]
  ): FileNode {
    const changeMap = new Map(changes.map(change => [change.path, change]));
    return this.enrichTreeWithChanges(baseTree, changeMap);
  }

  private enrichTreeWithChanges(
    node: FileNode,
    changeMap: Map<string, FileChange>
  ): FileNode {
    const enrichedNode = { ...node };
    
    if (changeMap.has(node.path)) {
      enrichedNode.change = changeMap.get(node.path);
    }

    if (node.children) {
      enrichedNode.children = node.children.map(child =>
        this.enrichTreeWithChanges(child, changeMap)
      );
    }

    return enrichedNode;
  }

  sortFileTree(node: FileNode): FileNode {
    const sortedNode = { ...node };
    
    if (node.children) {
      sortedNode.children = [...node.children].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      sortedNode.children = sortedNode.children.map(child =>
        this.sortFileTree(child)
      );
    }

    return sortedNode;
  }
}