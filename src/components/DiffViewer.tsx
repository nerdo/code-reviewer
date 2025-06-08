import { FileDiff, DiffLine } from '@/domain/entities/FileDiff';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface DiffViewerProps {
  diff: FileDiff;
  viewMode: 'side-by-side' | 'inline';
}

export function DiffViewer({ diff, viewMode }: DiffViewerProps) {
  if (diff.isBinary) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Binary file not shown
      </div>
    );
  }

  // Check if file has no changes (empty hunks and same content)
  const hasNoChanges = diff.hunks.length === 0 && diff.oldContent === diff.newContent;

  if (hasNoChanges) {
    return <UnchangedFileView diff={diff} />;
  }

  if (viewMode === 'inline') {
    return <InlineDiffView diff={diff} />;
  }

  return <SideBySideDiffView diff={diff} />;
}

function UnchangedFileView({ diff }: { diff: FileDiff }) {
  const lines = diff.newContent.split('\n');

  return (
    <div className="h-full">
      <div className="bg-muted px-4 py-2 text-center text-muted-foreground font-medium border-b">
        No changes between commits
      </div>
      <ScrollArea className="h-[calc(100%-40px)]">
        <div className="font-mono text-sm">
          {lines.map((line, index) => (
            <div key={index} className="flex">
              <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
                {index + 1}
              </span>
              <span className="flex-1 px-4 py-0.5">
                {line}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function InlineDiffView({ diff }: { diff: FileDiff }) {
  return (
    <ScrollArea className="h-full">
      <div className="font-mono text-sm">
        {diff.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="border-b last:border-b-0">
            <div className="bg-muted px-4 py-2 text-muted-foreground">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>
            {hunk.lines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className={cn(
                  "px-4 py-0.5",
                  line.type === 'add' && "bg-green-500/20 text-green-700 dark:text-green-400",
                  line.type === 'delete' && "bg-red-500/20 text-red-700 dark:text-red-400"
                )}
              >
                <span className="select-none pr-2 text-muted-foreground">
                  {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                </span>
                <span>{line.content}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function SideBySideDiffView({ diff }: { diff: FileDiff }) {
  const renderLine = (line: DiffLine | undefined, lineNumber: number | undefined, side: 'old' | 'new') => {
    if (!line) {
      return (
        <div className="flex">
          <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
            &nbsp;
          </span>
          <span className="flex-1 px-4 py-0.5 bg-muted/30">&nbsp;</span>
        </div>
      );
    }

    const isAdd = line.type === 'add';
    const isDelete = line.type === 'delete';
    const showLine = (side === 'old' && !isAdd) || (side === 'new' && !isDelete);

    if (!showLine) {
      return (
        <div className="flex">
          <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
            &nbsp;
          </span>
          <span className="flex-1 px-4 py-0.5 bg-muted/30">&nbsp;</span>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex",
          isAdd && "bg-green-500/20",
          isDelete && "bg-red-500/20"
        )}
      >
        <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
          {lineNumber}
        </span>
        <span className={cn(
          "flex-1 px-4 py-0.5",
          isAdd && "text-green-700 dark:text-green-400",
          isDelete && "text-red-700 dark:text-red-400"
        )}>
          {line.content}
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

  return (
    <div className="flex h-full font-mono text-sm">
      <div className="flex-1 border-r overflow-hidden">
        <div className="bg-muted px-4 py-2 font-semibold">
          {diff.previousPath || diff.path}
        </div>
        <ScrollArea className="h-[calc(100%-40px)]">
          <div>
            {processedLines.map((linePair, index) => (
              <div key={index}>
                {renderLine(linePair.old, linePair.old?.oldLineNumber, 'old')}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="bg-muted px-4 py-2 font-semibold">
          {diff.path}
        </div>
        <ScrollArea className="h-[calc(100%-40px)]">
          <div>
            {processedLines.map((linePair, index) => (
              <div key={index}>
                {renderLine(linePair.new, linePair.new?.newLineNumber, 'new')}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}