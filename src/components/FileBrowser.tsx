import React, { useState, useEffect, useCallback } from 'react';
import { FileNode } from '@/domain/entities/FileNode';
import { FileChangeType } from '@/domain/entities/FileChange';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Minus, Edit, MoveRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

interface FileBrowserProps {
  fileTree: FileNode;
  selectedFile?: string;
  onFileSelect: (path: string) => void;
}

export function FileBrowser({ fileTree, selectedFile, onFileSelect }: FileBrowserProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));

  const toggleDir = (path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Check if a directory has any changes in its subtree
  const hasChangesInSubtree = useCallback((node: FileNode): boolean => {
    // If this node itself has changes, return true
    if (node.change) {
      return true;
    }
    
    // If this is a file without changes, return false
    if (node.type === 'file') {
      return false;
    }
    
    // For directories, check all children recursively
    if (node.children) {
      return node.children.some(child => hasChangesInSubtree(child));
    }
    
    return false;
  }, []);

  // Auto-expand directories that contain changes (only on initial load)
  useEffect(() => {
    const pathsWithChanges = new Set<string>(['/']);
    
    const collectPathsWithChanges = (node: FileNode, currentPath: string = '') => {
      const fullPath = currentPath ? `${currentPath}/${node.name}` : node.name;
      
      if (hasChangesInSubtree(node)) {
        pathsWithChanges.add(fullPath);
        
        // Also add parent paths
        let parentPath = '';
        const parts = fullPath.split('/').filter(Boolean);
        for (let i = 0; i < parts.length - 1; i++) {
          parentPath = parentPath ? `${parentPath}/${parts[i]}` : parts[i];
          pathsWithChanges.add(parentPath);
        }
      }
      
      if (node.children) {
        node.children.forEach(child => collectPathsWithChanges(child, fullPath));
      }
    };
    
    if (fileTree.children) {
      fileTree.children.forEach(child => collectPathsWithChanges(child));
    }
    
    // Only auto-expand on initial load, preserve user's manual expansions
    setExpandedDirs(prev => {
      // If this is the first load (prev only has root '/'), use the auto-expanded paths
      if (prev.size === 1 && prev.has('/')) {
        return pathsWithChanges;
      }
      // Otherwise, merge the auto-expanded paths with existing manual expansions
      return new Set([...prev, ...pathsWithChanges]);
    });
  }, [fileTree, hasChangesInSubtree]);

  const getChangeIcon = (changeType: FileChangeType) => {
    switch (changeType) {
      case FileChangeType.Added:
        return <Plus className="h-4 w-4 text-green-500" />;
      case FileChangeType.Deleted:
        return <Minus className="h-4 w-4 text-red-500" />;
      case FileChangeType.Modified:
        return <Edit className="h-4 w-4 text-yellow-500" />;
      case FileChangeType.Renamed:
      case FileChangeType.Moved:
        return <MoveRight className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const renderNode = (node: FileNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = selectedFile === node.path;
    const paddingLeft = depth * 16 + 8;
    const hasNestedChanges = hasChangesInSubtree(node);

    if (node.type === 'file') {
      return (
        <div
          key={node.path}
          className={cn(
            "flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent min-w-fit",
            node.change && "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-400",
            isSelected && "bg-accent"
          )}
          style={{ paddingLeft }}
          onClick={() => onFileSelect(node.path)}
        >
          <File className={cn(
            "h-4 w-4 shrink-0",
            node.change && "text-blue-600 dark:text-blue-400"
          )} />
          <span className={cn(
            "text-sm whitespace-nowrap",
            node.change && "font-medium text-blue-700 dark:text-blue-300"
          )}>{node.name}</span>
          {node.change && getChangeIcon(node.change.changeType)}
        </div>
      );
    }

    return (
      <div key={node.path}>
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent min-w-fit",
            node.change && "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-400",
            !node.change && hasNestedChanges && "bg-orange-50/50 dark:bg-orange-950/20 border-l-2 border-l-orange-300 dark:border-l-orange-600"
          )}
          style={{ paddingLeft }}
          onClick={() => toggleDir(node.path)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className={cn(
              "h-4 w-4 shrink-0",
              node.change && "text-blue-600 dark:text-blue-400",
              !node.change && hasNestedChanges && "text-orange-600 dark:text-orange-400"
            )} />
          ) : (
            <Folder className={cn(
              "h-4 w-4 shrink-0",
              node.change && "text-blue-600 dark:text-blue-400",
              !node.change && hasNestedChanges && "text-orange-600 dark:text-orange-400"
            )} />
          )}
          <span className={cn(
            "text-sm whitespace-nowrap",
            node.change && "font-medium text-blue-700 dark:text-blue-300",
            !node.change && hasNestedChanges && "font-medium text-orange-700 dark:text-orange-300"
          )}>{node.name}</span>
          {node.change && getChangeIcon(node.change.changeType)}
          {!node.change && hasNestedChanges && (
            <span className="text-xs text-orange-600 dark:text-orange-400 ml-auto">
              changes
            </span>
          )}
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-2 min-w-0">
        <div className="min-w-fit">
          {fileTree.children?.map(child => renderNode(child))}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}