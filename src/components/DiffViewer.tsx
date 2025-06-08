import { useRef, useState, useEffect } from 'react';
import { FileDiff, DiffLine } from '@/domain/entities/FileDiff';
import { cn, expandTabs } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
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
  const getLinkedLineId = (lineId: string, processedLines?: Array<{ old: ProcessedLine; new: ProcessedLine }>): string | null => {
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
  getLinkedLineId: (lineId: string, processedLines?: Array<{ old: ProcessedLine; new: ProcessedLine }>) => string | null;
}

function UnchangedFileView({ diff, highlighterEnabled, highlightedLines, setHighlightedLines, hoveredLine, setHoveredLine, isDragging, setIsDragging, dragStart, setDragStart }: { diff: FileDiff } & HighlighterProps) {
  const { settings } = useSettings();
  const lines = diff.newContent.split('\n');
  const [dragIsRemoving, setDragIsRemoving] = useState(false);

  // Helper function to get filename display text
  const getFilenameDisplay = (diff: FileDiff): string => {
    if (!diff.previousPath || diff.previousPath === diff.path) {
      return diff.path;
    }
    return `${diff.previousPath} → ${diff.path}`;
  };

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
    <ScrollArea className="h-full">
      <div className="bg-muted px-4 py-2 font-semibold border-b">
        {getFilenameDisplay(diff)}
      </div>
      <div className="font-mono text-sm" style={{ lineHeight: settings.lineHeight }}>
        {lines.map((line, index) => {
          const lineId = `unchanged-${index + 1}`;
          const isHighlighted = highlightedLines.has(lineId);
          const isHovered = hoveredLine === lineId;
          
          return (
            <div 
              key={index} 
              className={cn(
                "flex whitespace-pre",
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
              {/* Fixed line numbers that don't scroll horizontally */}
              <div className="w-12 flex-shrink-0 bg-muted border-r px-2 py-0.5 text-right text-muted-foreground sticky left-0">
                {index + 1}
              </div>
              {/* Content that scrolls horizontally */}
              <div className="px-4 py-0.5 flex-1">
                {expandTabs(line, settings.tabSize)}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function InlineDiffView({ diff, highlighterEnabled, highlightedLines, setHighlightedLines, hoveredLine, setHoveredLine, isDragging, setIsDragging, dragStart, setDragStart }: { diff: FileDiff } & HighlighterProps) {
  const { settings } = useSettings();
  const [dragIsRemoving, setDragIsRemoving] = useState(false);

  // Helper function to get filename display text
  const getFilenameDisplay = (diff: FileDiff): string => {
    if (!diff.previousPath || diff.previousPath === diff.path) {
      return diff.path;
    }
    return `${diff.previousPath} → ${diff.path}`;
  };

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
    <ScrollArea className="h-full min-h-0">
      <div className="bg-muted px-4 py-2 font-semibold border-b">
        {getFilenameDisplay(diff)}
      </div>
      <div className="font-mono text-sm" style={{ lineHeight: settings.lineHeight }}>
        {diff.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="border-b last:border-b-0">
            <div className="bg-muted px-4 py-2 text-muted-foreground flex">
              {/* Fixed hunk header line numbers */}
              <div className="w-20 flex-shrink-0 sticky left-0 bg-muted"></div>
              <div className="flex-1">
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </div>
            </div>
            {hunk.lines.map((line, lineIndex) => {
              const lineId = `inline-${hunkIndex}-${lineIndex}`;
              const isHighlighted = highlightedLines.has(lineId);
              const isHovered = hoveredLine === lineId;

              return (
                <div
                  key={lineIndex}
                  className={cn(
                    "flex whitespace-pre",
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
                  {/* Fixed line numbers and symbols that don't scroll horizontally */}
                  <div className="w-20 flex-shrink-0 bg-muted border-r flex sticky left-0">
                    <span className="w-12 px-2 text-right text-muted-foreground py-0.5">
                      {line.oldLineNumber || line.newLineNumber || ''}
                    </span>
                    <span className="w-4 px-2 text-muted-foreground py-0.5">
                      {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                    </span>
                  </div>
                  {/* Content that scrolls horizontally */}
                  <div className="px-2 py-0.5 flex-1">
                    {expandTabs(line.content, settings.tabSize)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
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
  const getSideBySideHighlightClass = (lineId: string, index: number, allProcessedLines: Array<{ old: ProcessedLine; new: ProcessedLine }>) => {
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
      const viewport = event.currentTarget.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
      if (!viewport) return;
      
      const scrollTop = viewport.scrollTop;
      const scrollLeft = viewport.scrollLeft;
      
      if (source === 'left' && rightScrollRef.current) {
        const rightViewport = rightScrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
        if (rightViewport) {
          rightViewport.scrollTop = scrollTop;
          rightViewport.scrollLeft = scrollLeft;
        }
      } else if (source === 'right' && leftScrollRef.current) {
        const leftViewport = leftScrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
        if (leftViewport) {
          leftViewport.scrollTop = scrollTop;
          leftViewport.scrollLeft = scrollLeft;
        }
      }
    };
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
    <div className="flex h-full font-mono text-sm min-h-0">
      <div className="flex-1 border-r overflow-hidden flex flex-col min-h-0">
        <div className="bg-muted px-4 py-2 font-semibold shrink-0">
          {diff.previousPath || diff.path}
        </div>
        <ScrollArea 
          ref={leftScrollRef}
          className="flex-1 min-h-0"
          onScrollCapture={handleScroll('left')}
        >
          <div style={{ lineHeight: settings.lineHeight }}>
            {processedLines.map((linePair, index) => {
              const line = linePair.old;
              const lineId = line ? `old-${index}` : `empty-old-${index}`;
              const isHighlighted = highlightedLines.has(lineId);
              const isHovered = hoveredLine === lineId;

              if (!line) {
                return (
                  <div 
                    key={index}
                    className={cn(
                      "flex whitespace-pre bg-muted/30",
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
                    <div className="w-12 flex-shrink-0 bg-muted border-r px-2 py-0.5 text-right text-muted-foreground sticky left-0">
                      {/* Empty line number */}
                    </div>
                    <div className="px-4 py-0.5 flex-1">
                      &nbsp;
                    </div>
                  </div>
                );
              }

              const isAdd = line.type === 'add';
              const isDelete = line.type === 'delete';
              const showLine = !isAdd;

              if (!showLine) {
                return (
                  <div 
                    key={index}
                    className={cn(
                      "flex whitespace-pre bg-muted/30",
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
                    <div className="w-12 flex-shrink-0 bg-muted border-r px-2 py-0.5 text-right text-muted-foreground sticky left-0">
                      {/* Empty line number */}
                    </div>
                    <div className="px-4 py-0.5 flex-1">
                      &nbsp;
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={index}
                  className={cn(
                    "flex whitespace-pre",
                    isAdd && "bg-green-500/20 text-green-700 dark:text-green-400",
                    isDelete && "bg-red-500/20 text-red-700 dark:text-red-400",
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
                  <div className="w-12 flex-shrink-0 bg-muted border-r px-2 py-0.5 text-right text-muted-foreground sticky left-0">
                    {line.oldLineNumber || ''}
                  </div>
                  <div className="px-4 py-0.5 flex-1">
                    {expandTabs(line.content, settings.tabSize)}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="bg-muted px-4 py-2 font-semibold shrink-0">
          {diff.path}
        </div>
        <ScrollArea 
          ref={rightScrollRef}
          className="flex-1 min-h-0"
          onScrollCapture={handleScroll('right')}
        >
          <div style={{ lineHeight: settings.lineHeight }}>
            {processedLines.map((linePair, index) => {
              const line = linePair.new;
              const lineId = line ? `new-${index}` : `empty-new-${index}`;
              const isHighlighted = highlightedLines.has(lineId);
              const isHovered = hoveredLine === lineId;

              if (!line) {
                return (
                  <div 
                    key={index}
                    className={cn(
                      "flex whitespace-pre bg-muted/30",
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
                    <div className="w-12 flex-shrink-0 bg-muted border-r px-2 py-0.5 text-right text-muted-foreground sticky left-0">
                      {/* Empty line number */}
                    </div>
                    <div className="px-4 py-0.5 flex-1">
                      &nbsp;
                    </div>
                  </div>
                );
              }

              const isAdd = line.type === 'add';
              const isDelete = line.type === 'delete';
              const showLine = !isDelete;

              if (!showLine) {
                return (
                  <div 
                    key={index}
                    className={cn(
                      "flex whitespace-pre bg-muted/30",
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
                    <div className="w-12 flex-shrink-0 bg-muted border-r px-2 py-0.5 text-right text-muted-foreground sticky left-0">
                      {/* Empty line number */}
                    </div>
                    <div className="px-4 py-0.5 flex-1">
                      &nbsp;
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={index}
                  className={cn(
                    "flex whitespace-pre",
                    isAdd && "bg-green-500/20 text-green-700 dark:text-green-400",
                    isDelete && "bg-red-500/20 text-red-700 dark:text-red-400",
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
                  <div className="w-12 flex-shrink-0 bg-muted border-r px-2 py-0.5 text-right text-muted-foreground sticky left-0">
                    {line.newLineNumber || ''}
                  </div>
                  <div className="px-4 py-0.5 flex-1">
                    {expandTabs(line.content, settings.tabSize)}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
}