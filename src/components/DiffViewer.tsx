import { useRef, useState, useEffect } from 'react';
import { FileDiff, DiffLine } from '@/domain/entities/FileDiff';
import { cn, expandTabs } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { useSettings } from './settings-provider';

interface DiffViewerProps {
  diff: FileDiff;
  viewMode: 'side-by-side' | 'inline';
  highlighterEnabled?: boolean;
  linkHighlights?: boolean;
  linkMode?: 'line-number' | 'visual-position';
  clearHighlightsRef?: React.MutableRefObject<(() => void) | null>;
}

export function DiffViewer({ diff, viewMode, highlighterEnabled = false, linkHighlights = true, linkMode = 'line-number', clearHighlightsRef }: DiffViewerProps) {
  const [highlightedLines, setHighlightedLines] = useState<Set<string>>(new Set());
  const [hoveredLine, setHoveredLine] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);

  // Expose clear function to parent
  useEffect(() => {
    if (clearHighlightsRef) {
      clearHighlightsRef.current = () => setHighlightedLines(new Set());
    }
  }, [clearHighlightsRef]);

  // Helper to get linked line ID for side-by-side view
  const getLinkedLineId = (lineId: string, processedLines?: Array<{ old: any; new: any }>): string | null => {
    if (!linkHighlights || viewMode !== 'side-by-side') return null;
    
    const parts = lineId.split('-');
    if (parts.length < 2) return null;
    
    const side = parts[0] as 'old' | 'new';
    const index = parseInt(parts[1]);
    
    if (linkMode === 'line-number') {
      // Link by actual line number - find lines with same line numbers in the diff
      if (!processedLines || index >= processedLines.length) return null;
      
      const currentLine = side === 'old' ? processedLines[index].old : processedLines[index].new;
      if (!currentLine) return null;
      
      const targetLineNumber = side === 'old' ? currentLine.oldLineNumber : currentLine.newLineNumber;
      if (!targetLineNumber) return null;
      
      // Find the line on the other side with the same line number
      for (let i = 0; i < processedLines.length; i++) {
        const otherLine = side === 'old' ? processedLines[i].new : processedLines[i].old;
        if (otherLine) {
          const otherLineNumber = side === 'old' ? otherLine.newLineNumber : otherLine.oldLineNumber;
          if (otherLineNumber === targetLineNumber) {
            return side === 'old' ? `new-${i}` : `old-${i}`;
          }
        }
      }
      return null;
    } else if (linkMode === 'visual-position') {
      // Link by visual position - lines that are visually across from each other (same index)
      if (side === 'old') {
        return `new-${index}`;
      } else {
        return `old-${index}`;
      }
    }
    
    return null;
  };

  if (diff.isBinary) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Binary file not shown
      </div>
    );
  }

  // Check if file has no changes (empty hunks and same content)
  const hasNoChanges = diff.hunks.length === 0 && diff.oldContent === diff.newContent;

  const highlighterProps: HighlighterProps = {
    highlighterEnabled,
    highlightedLines,
    setHighlightedLines,
    hoveredLine,
    setHoveredLine,
    isDragging,
    setIsDragging,
    dragStart,
    setDragStart,
    linkHighlights,
    linkMode,
    getLinkedLineId
  };

  if (hasNoChanges) {
    return <UnchangedFileView diff={diff} {...highlighterProps} />;
  }

  if (viewMode === 'inline') {
    return <InlineDiffView diff={diff} {...highlighterProps} />;
  }

  return <SideBySideDiffView diff={diff} {...highlighterProps} />;
}

interface HighlighterProps {
  highlighterEnabled: boolean;
  highlightedLines: Set<string>;
  setHighlightedLines: (lines: Set<string>) => void;
  hoveredLine: string | null;
  setHoveredLine: (line: string | null) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  dragStart: string | null;
  setDragStart: (start: string | null) => void;
  linkHighlights: boolean;
  linkMode: 'line-number' | 'visual-position';
  getLinkedLineId: (lineId: string, processedLines?: Array<any>) => string | null;
}

function UnchangedFileView({ diff, highlighterEnabled, highlightedLines, setHighlightedLines, hoveredLine, setHoveredLine, isDragging, setIsDragging, dragStart, setDragStart }: { diff: FileDiff } & HighlighterProps) {
  const { settings } = useSettings();
  const lines = diff.newContent.split('\n');
  const [dragIsRemoving, setDragIsRemoving] = useState(false);

  const handleStart = (lineId: string) => {
    if (!highlighterEnabled) return;
    setIsDragging(true);
    setDragStart(lineId);
    setDragIsRemoving(highlightedLines.has(lineId));
  };

  const handleMove = (lineId: string) => {
    if (!highlighterEnabled) return;
    setHoveredLine(lineId);
    
    if (isDragging && dragStart) {
      // During drag, add or remove highlights based on whether drag started on highlighted line
      const startIndex = parseInt(dragStart.split('-')[1]) - 1;
      const currentIndex = parseInt(lineId.split('-')[1]) - 1;
      const minIndex = Math.min(startIndex, currentIndex);
      const maxIndex = Math.max(startIndex, currentIndex);
      
      const newHighlighted = new Set(highlightedLines);
      for (let i = minIndex; i <= maxIndex; i++) {
        const targetLineId = `unchanged-${i + 1}`;
        if (dragIsRemoving) {
          newHighlighted.delete(targetLineId);
        } else {
          newHighlighted.add(targetLineId);
        }
      }
      setHighlightedLines(newHighlighted);
    }
  };

  const handleEnd = () => {
    if (!highlighterEnabled) return;
    setIsDragging(false);
    setDragStart(null);
    setDragIsRemoving(false);
  };

  const handleLineClick = (lineId: string) => {
    if (!highlighterEnabled || isDragging) return;
    
    const newHighlighted = new Set(highlightedLines);
    if (newHighlighted.has(lineId)) {
      newHighlighted.delete(lineId);
    } else {
      newHighlighted.add(lineId);
    }
    setHighlightedLines(newHighlighted);
  };

  const handleLineHover = (lineId: string | null) => {
    if (!highlighterEnabled || isDragging) return;
    setHoveredLine(lineId);
  };

  // Global event handlers for drag end
  useEffect(() => {
    const globalEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
    setDragIsRemoving(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mouseup', globalEnd);
      document.addEventListener('touchend', globalEnd);
      document.addEventListener('touchcancel', globalEnd);
      return () => {
        document.removeEventListener('mouseup', globalEnd);
        document.removeEventListener('touchend', globalEnd);
        document.removeEventListener('touchcancel', globalEnd);
      };
    }
  }, [isDragging, setIsDragging, setDragStart, setDragIsRemoving]);

  // Helper to check if adjacent lines are highlighted (for border styling)
  const getHighlightClass = (lineId: string, index: number) => {
    const isHighlighted = highlightedLines.has(lineId);
    if (!isHighlighted) return '';
    
    const prevLineId = `unchanged-${index}`;
    const nextLineId = `unchanged-${index + 2}`;
    const isPrevHighlighted = index > 0 && highlightedLines.has(prevLineId);
    const isNextHighlighted = index < lines.length - 1 && highlightedLines.has(nextLineId);
    
    return cn(
      "bg-yellow-200 dark:bg-yellow-900/50",
      !isPrevHighlighted && "border-t-2 border-yellow-400",
      !isNextHighlighted && "border-b-2 border-yellow-400",
      "border-l-2 border-r-2 border-yellow-400"
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-muted px-4 py-2 text-center text-muted-foreground font-medium border-b shrink-0">
        No changes between commits
      </div>
      <ScrollArea className="flex-1 w-full">
        <div className="font-mono text-sm w-max min-w-full" style={{ lineHeight: settings.lineHeight }}>
          {lines.map((line, index) => {
            const lineId = `unchanged-${index + 1}`;
            const isHighlighted = highlightedLines.has(lineId);
            const isHovered = hoveredLine === lineId;
            
            return (
              <div 
                key={index} 
                className={cn(
                  "flex",
                  highlighterEnabled && "cursor-pointer select-none",
                  getHighlightClass(lineId, index),
                  isHovered && highlighterEnabled && !isDragging && !isHighlighted && "bg-blue-100 dark:bg-blue-900/30"
                )}
                onMouseDown={() => handleStart(lineId)}
                onMouseEnter={() => handleMove(lineId)}
                onMouseUp={handleEnd}
                onMouseLeave={() => handleLineHover(null)}
                onTouchStart={() => handleStart(lineId)}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const element = document.elementFromPoint(touch.clientX, touch.clientY);
                  const touchLineId = element?.getAttribute('data-line-id');
                  if (touchLineId) handleMove(touchLineId);
                }}
                onTouchEnd={handleEnd}
                onClick={() => handleLineClick(lineId)}
                data-line-id={lineId}
              >
                <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
                  {index + 1}
                </span>
                <span className="px-4 py-0.5 whitespace-pre">
                  {expandTabs(line, settings.tabSize)}
                </span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function InlineDiffView({ diff, highlighterEnabled, highlightedLines, setHighlightedLines, hoveredLine, setHoveredLine, isDragging, setIsDragging, dragStart, setDragStart }: { diff: FileDiff } & HighlighterProps) {
  const { settings } = useSettings();
  const [dragIsRemoving, setDragIsRemoving] = useState(false);

  // Create array of all line IDs for drag selection
  const allLineIds: string[] = [];
  diff.hunks.forEach((hunk, hunkIndex) => {
    hunk.lines.forEach((_, lineIndex) => {
      allLineIds.push(`inline-${hunkIndex}-${lineIndex}`);
    });
  });

  const handleStart = (lineId: string) => {
    if (!highlighterEnabled) return;
    setIsDragging(true);
    setDragStart(lineId);
    setDragIsRemoving(highlightedLines.has(lineId));
  };

  const handleMove = (lineId: string) => {
    if (!highlighterEnabled) return;
    setHoveredLine(lineId);
    
    if (isDragging && dragStart) {
      // During drag, add or remove highlights based on whether drag started on highlighted line
      const startIndex = allLineIds.indexOf(dragStart);
      const currentIndex = allLineIds.indexOf(lineId);
      const minIndex = Math.min(startIndex, currentIndex);
      const maxIndex = Math.max(startIndex, currentIndex);
      
      const newHighlighted = new Set(highlightedLines);
      for (let i = minIndex; i <= maxIndex; i++) {
        if (dragIsRemoving) {
          newHighlighted.delete(allLineIds[i]);
        } else {
          newHighlighted.add(allLineIds[i]);
        }
      }
      setHighlightedLines(newHighlighted);
    }
  };

  const handleEnd = () => {
    if (!highlighterEnabled) return;
    setIsDragging(false);
    setDragStart(null);
    setDragIsRemoving(false);
  };

  const handleLineClick = (lineId: string) => {
    if (!highlighterEnabled || isDragging) return;
    
    const newHighlighted = new Set(highlightedLines);
    if (newHighlighted.has(lineId)) {
      newHighlighted.delete(lineId);
    } else {
      newHighlighted.add(lineId);
    }
    setHighlightedLines(newHighlighted);
  };

  const handleLineHover = (lineId: string | null) => {
    if (!highlighterEnabled || isDragging) return;
    setHoveredLine(lineId);
  };

  // Global event handlers for drag end
  useEffect(() => {
    const globalEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
    setDragIsRemoving(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mouseup', globalEnd);
      document.addEventListener('touchend', globalEnd);
      document.addEventListener('touchcancel', globalEnd);
      return () => {
        document.removeEventListener('mouseup', globalEnd);
        document.removeEventListener('touchend', globalEnd);
        document.removeEventListener('touchcancel', globalEnd);
      };
    }
  }, [isDragging, setIsDragging, setDragStart, setDragIsRemoving]);

  // Helper to get smart highlight class for inline diff
  const getInlineHighlightClass = (lineId: string, hunkIndex: number, lineIndex: number) => {
    const isHighlighted = highlightedLines.has(lineId);
    if (!isHighlighted) return '';
    
    const prevLineId = `inline-${hunkIndex}-${lineIndex - 1}`;
    const nextLineId = `inline-${hunkIndex}-${lineIndex + 1}`;
    const isPrevHighlighted = lineIndex > 0 && highlightedLines.has(prevLineId);
    const isNextHighlighted = highlightedLines.has(nextLineId);
    
    return cn(
      "bg-yellow-200 dark:bg-yellow-900/50",
      !isPrevHighlighted && "border-t-2 border-yellow-400",
      !isNextHighlighted && "border-b-2 border-yellow-400",
      "border-l-2 border-r-2 border-yellow-400"
    );
  };

  return (
    <ScrollArea className="h-full w-full">
      <div className="font-mono text-sm w-max min-w-full" style={{ lineHeight: settings.lineHeight }}>
        {diff.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="border-b last:border-b-0">
            <div className="bg-muted px-4 py-2 text-muted-foreground">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            {hunk.lines.map((line, lineIndex) => {
              const lineId = `inline-${hunkIndex}-${lineIndex}`;
              const isHighlighted = highlightedLines.has(lineId);
              const isHovered = hoveredLine === lineId;

              return (
                <div
                  key={lineIndex}
                  className={cn(
                    "flex",
                    line.type === 'add' && "bg-green-500/20 text-green-700 dark:text-green-400",
                    line.type === 'delete' && "bg-red-500/20 text-red-700 dark:text-red-400",
                    highlighterEnabled && "cursor-pointer select-none",
                    getInlineHighlightClass(lineId, hunkIndex, lineIndex),
                    isHovered && highlighterEnabled && !isDragging && !isHighlighted && "bg-blue-100 dark:bg-blue-900/30"
                  )}
                  onMouseDown={() => handleStart(lineId)}
                  onMouseEnter={() => handleMove(lineId)}
                  onMouseUp={handleEnd}
                  onMouseLeave={() => handleLineHover(null)}
                  onTouchStart={() => handleStart(lineId)}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                    const touchLineId = element?.getAttribute('data-line-id');
                    if (touchLineId) handleMove(touchLineId);
                  }}
                  onTouchEnd={handleEnd}
                  onClick={() => handleLineClick(lineId)}
                  data-line-id={lineId}
                >
                  <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
                    {line.oldLineNumber || line.newLineNumber || ''}
                  </span>
                  <span className="w-4 select-none px-2 py-0.5 text-muted-foreground">
                    {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                  </span>
                  <span className="px-2 py-0.5 whitespace-pre">
                    {expandTabs(line.content, settings.tabSize)}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function SideBySideDiffView({ diff, highlighterEnabled, highlightedLines, setHighlightedLines, hoveredLine, setHoveredLine, isDragging, setIsDragging, dragStart, setDragStart, linkHighlights, getLinkedLineId }: { diff: FileDiff } & HighlighterProps) {
  const { settings } = useSettings();
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const [dragIsRemoving, setDragIsRemoving] = useState(false);


  const handleStart = (lineId: string) => {
    if (!highlighterEnabled) return;
    setIsDragging(true);
    setDragStart(lineId);
    setDragIsRemoving(highlightedLines.has(lineId));
  };

  const handleMove = (lineId: string) => {
    if (!highlighterEnabled) return;
    setHoveredLine(lineId);
    
    if (isDragging && dragStart) {
      // During drag, add or remove highlights based on whether drag started on highlighted line
      const side = lineId.split('-')[0] as 'old' | 'new';
      const dragSide = dragStart.split('-')[0] as 'old' | 'new';
      
      // Only allow dragging within the same side
      if (side === dragSide) {
        const startIndex = parseInt(dragStart.split('-')[1]);
        const currentIndex = parseInt(lineId.split('-')[1]);
        const minIndex = Math.min(startIndex, currentIndex);
        const maxIndex = Math.max(startIndex, currentIndex);
        
        const newHighlighted = new Set(highlightedLines);
        for (let i = minIndex; i <= maxIndex; i++) {
          const currentLineId = `${side}-${i}`;
          if (dragIsRemoving) {
            newHighlighted.delete(currentLineId);
            // If linking is enabled, also remove the corresponding line on the other side
            if (linkHighlights) {
              const linkedLineId = getLinkedLineId(currentLineId, processedLines);
              if (linkedLineId) {
                newHighlighted.delete(linkedLineId);
              }
            }
          } else {
            newHighlighted.add(currentLineId);
            // If linking is enabled, also highlight the corresponding line on the other side
            if (linkHighlights) {
              const linkedLineId = getLinkedLineId(currentLineId, processedLines);
              if (linkedLineId) {
                newHighlighted.add(linkedLineId);
              }
            }
          }
        }
        setHighlightedLines(newHighlighted);
      }
    }
  };

  const handleEnd = () => {
    if (!highlighterEnabled) return;
    setIsDragging(false);
    setDragStart(null);
    setDragIsRemoving(false);
  };

  const handleLineClick = (lineId: string) => {
    if (!highlighterEnabled || isDragging) return;
    
    const newHighlighted = new Set(highlightedLines);
    const isCurrentlyHighlighted = newHighlighted.has(lineId);
    
    if (isCurrentlyHighlighted) {
      newHighlighted.delete(lineId);
      // If linking is enabled, also remove the linked line
      if (linkHighlights) {
        const linkedLineId = getLinkedLineId(lineId, processedLines);
        if (linkedLineId) {
          newHighlighted.delete(linkedLineId);
        }
      }
    } else {
      newHighlighted.add(lineId);
      // If linking is enabled, also highlight the linked line
      if (linkHighlights) {
        const linkedLineId = getLinkedLineId(lineId, processedLines);
        if (linkedLineId) {
          newHighlighted.add(linkedLineId);
        }
      }
    }
    setHighlightedLines(newHighlighted);
  };

  const handleLineHover = (lineId: string | null) => {
    if (!highlighterEnabled || isDragging) return;
    setHoveredLine(lineId);
  };

  // Global event handlers for drag end
  useEffect(() => {
    const globalEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
    setDragIsRemoving(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mouseup', globalEnd);
      document.addEventListener('touchend', globalEnd);
      document.addEventListener('touchcancel', globalEnd);
      return () => {
        document.removeEventListener('mouseup', globalEnd);
        document.removeEventListener('touchend', globalEnd);
        document.removeEventListener('touchcancel', globalEnd);
      };
    }
  }, [isDragging, setIsDragging, setDragStart, setDragIsRemoving]);

  // Helper to get smart highlight class for side-by-side diff
  const getSideBySideHighlightClass = (lineId: string, index: number, allProcessedLines: Array<any>) => {
    const isHighlighted = highlightedLines.has(lineId);
    if (!isHighlighted) return '';
    
    const side = lineId.split('-')[0];
    const prevLineId = `${side}-${index - 1}`;
    const nextLineId = `${side}-${index + 1}`;
    const isPrevHighlighted = index > 0 && highlightedLines.has(prevLineId);
    const isNextHighlighted = index < allProcessedLines.length - 1 && highlightedLines.has(nextLineId);
    
    return cn(
      "bg-yellow-200 dark:bg-yellow-900/50",
      !isPrevHighlighted && "border-t-2 border-yellow-400",
      !isNextHighlighted && "border-b-2 border-yellow-400",
      "border-l-2 border-r-2 border-yellow-400"
    );
  };

  const handleScroll = (source: 'left' | 'right') => {
    return (event: React.UIEvent<HTMLDivElement>) => {
      const scrollTop = event.currentTarget.scrollTop;
      const scrollLeft = event.currentTarget.scrollLeft;
      
      if (source === 'left' && rightScrollRef.current) {
        rightScrollRef.current.scrollTop = scrollTop;
        rightScrollRef.current.scrollLeft = scrollLeft;
      } else if (source === 'right' && leftScrollRef.current) {
        leftScrollRef.current.scrollTop = scrollTop;
        leftScrollRef.current.scrollLeft = scrollLeft;
      }
    };
  };

  const renderLine = (line: DiffLine | undefined, lineNumber: number | undefined, side: 'old' | 'new', index: number, allProcessedLines: Array<any>) => {
    const lineId = line ? `${side}-${index}` : `empty-${side}-${index}`;
    const isHighlighted = highlightedLines.has(lineId);
    const isHovered = hoveredLine === lineId;

    if (!line) {
      return (
        <div 
          className={cn(
            "flex",
            highlighterEnabled && "cursor-pointer select-none",
            getSideBySideHighlightClass(lineId, index, allProcessedLines),
            isHovered && highlighterEnabled && !isDragging && !isHighlighted && "bg-blue-100 dark:bg-blue-900/30"
          )}
          onMouseDown={() => handleStart(lineId)}
          onMouseEnter={() => handleMove(lineId)}
          onMouseUp={handleEnd}
          onMouseLeave={() => handleLineHover(null)}
          onTouchStart={() => handleStart(lineId)}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            const touchLineId = element?.getAttribute('data-line-id');
            if (touchLineId) handleMove(touchLineId);
          }}
          onTouchEnd={handleEnd}
          onClick={() => handleLineClick(lineId)}
          data-line-id={lineId}
        >
          <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
            &nbsp;
          </span>
          <span className="px-4 py-0.5 bg-muted/30 block">&nbsp;</span>
        </div>
      );
    }

    const isAdd = line.type === 'add';
    const isDelete = line.type === 'delete';
    const showLine = (side === 'old' && !isAdd) || (side === 'new' && !isDelete);

    if (!showLine) {
      return (
        <div 
          className={cn(
            "flex",
            highlighterEnabled && "cursor-pointer select-none",
            getSideBySideHighlightClass(lineId, index, allProcessedLines),
            isHovered && highlighterEnabled && !isDragging && !isHighlighted && "bg-blue-100 dark:bg-blue-900/30"
          )}
          onMouseDown={() => handleStart(lineId)}
          onMouseEnter={() => handleMove(lineId)}
          onMouseUp={handleEnd}
          onMouseLeave={() => handleLineHover(null)}
          onTouchStart={() => handleStart(lineId)}
          onTouchMove={(e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            const touchLineId = element?.getAttribute('data-line-id');
            if (touchLineId) handleMove(touchLineId);
          }}
          onTouchEnd={handleEnd}
          onClick={() => handleLineClick(lineId)}
          data-line-id={lineId}
        >
          <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
            &nbsp;
          </span>
          <span className="px-4 py-0.5 bg-muted/30 block">&nbsp;</span>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex",
          isAdd && "bg-green-500/20",
          isDelete && "bg-red-500/20",
          highlighterEnabled && "cursor-pointer select-none",
          getSideBySideHighlightClass(lineId, index, processedLines),
          isHovered && highlighterEnabled && !isDragging && !isHighlighted && "bg-blue-100 dark:bg-blue-900/30"
        )}
        onMouseDown={() => handleStart(lineId)}
        onMouseEnter={() => handleMove(lineId)}
        onMouseUp={handleEnd}
        onMouseLeave={() => handleLineHover(null)}
        onTouchStart={() => handleStart(lineId)}
        onTouchMove={(e) => {
          e.preventDefault();
          const touch = e.touches[0];
          const element = document.elementFromPoint(touch.clientX, touch.clientY);
          const touchLineId = element?.getAttribute('data-line-id');
          if (touchLineId) handleMove(touchLineId);
        }}
        onTouchEnd={handleEnd}
        onClick={() => handleLineClick(lineId)}
        data-line-id={lineId}
      >
        <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
          {lineNumber}
        </span>
        <span className={cn(
          "px-4 py-0.5 whitespace-pre block",
          isAdd && "text-green-700 dark:text-green-400",
          isDelete && "text-red-700 dark:text-red-400"
        )}>
          {expandTabs(line.content, settings.tabSize)}
        </span>
      </div>
    );
  };

  const processedLines: Array<{ old: DiffLine | undefined; new: DiffLine | undefined }> = [];
  
  diff.hunks.forEach(hunk => {
    hunk.lines.forEach(line => {
      if (line.type === 'normal') {
        processedLines.push({ old: line, new: line });
      } else if (line.type === 'delete') {
        processedLines.push({ old: line, new: undefined });
      } else if (line.type === 'add') {
        const lastLine = processedLines[processedLines.length - 1];
        if (lastLine && lastLine.old && lastLine.old.type === 'delete' && !lastLine.new) {
          lastLine.new = line;
        } else {
          processedLines.push({ old: undefined, new: line });
        }
      }
    });
  });

  // Create array of all line IDs for drag selection  
  const allLineIds: string[] = [];
  for (let i = 0; i < processedLines.length; i++) {
    allLineIds.push(`old-${i}`);
    allLineIds.push(`new-${i}`);
  }

  return (
    <div className="flex h-full font-mono text-sm">
      <div className="flex-1 border-r overflow-hidden flex flex-col">
        <div className="bg-muted px-4 py-2 font-semibold shrink-0">
          {diff.previousPath || diff.path}
        </div>
        <div 
          ref={leftScrollRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll('left')}
        >
          <div className="w-max min-w-full" style={{ lineHeight: settings.lineHeight }}>
            {processedLines.map((linePair, index) => (
              <div key={index}>
                {renderLine(linePair.old, linePair.old?.oldLineNumber, 'old', index, processedLines)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="bg-muted px-4 py-2 font-semibold shrink-0">
          {diff.path}
        </div>
        <div 
          ref={rightScrollRef}
          className="flex-1 overflow-auto"
          onScroll={handleScroll('right')}
        >
          <div className="w-max min-w-full" style={{ lineHeight: settings.lineHeight }}>
            {processedLines.map((linePair, index) => (
              <div key={index}>
                {renderLine(linePair.new, linePair.new?.newLineNumber, 'new', index, processedLines)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}