import React, { useState } from 'react';
import { FileNode } from '@/domain/entities/FileNode';
import { FileChangeType } from '@/domain/entities/FileChange';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Minus, Edit, MoveRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

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

    if (node.type === 'file') {
      return (
        <div
          key={node.path}
          className={cn(
            "flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent",
            isSelected && "bg-accent"
          )}
          style={{ paddingLeft }}
          onClick={() => onFileSelect(node.path)}
        >
          <File className="h-4 w-4 shrink-0" />
          <span className="text-sm truncate">{node.name}</span>
          {node.change && getChangeIcon(node.change.changeType)}
        </div>
      );
    }

    return (
      <div key={node.path}>
        <div
          className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-accent"
          style={{ paddingLeft }}
          onClick={() => toggleDir(node.path)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 shrink-0" />
          )}
          <span className="text-sm truncate">{node.name}</span>
          {node.change && getChangeIcon(node.change.changeType)}
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
      <div className="p-2">
        {fileTree.children?.map(child => renderNode(child))}
      </div>
    </ScrollArea>
  );
}