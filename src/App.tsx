import React, { useState, useEffect, useRef } from 'react';
import { FileBrowser } from './components/FileBrowser';
import { DiffViewer } from './components/DiffViewer';
import { CommitSelector } from './components/CommitSelector';
import { CommitFilter } from './components/CommitFilter';
import { BranchCommitSelector } from './components/BranchCommitSelector';
import { AutocompleteSelect } from './components/AutocompleteSelect';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { SettingsDialog } from './components/settings-dialog';
import { api } from './services/api';
import { FileNode } from './domain/entities/FileNode';
import { FileDiff } from './domain/entities/FileDiff';
import { Commit } from './domain/entities/Commit';
import { Repository } from './domain/entities/Repository';
import { GitBranch, RefreshCw, Settings, Highlighter, Link2Off, Hash, Eye, Eraser, GripVertical } from 'lucide-react';
import { cn } from './lib/utils';
import { useSettings } from './components/settings-provider';

function App() {
  const { settings } = useSettings();
  const [repoPath, setRepoPath] = useState<string>('./test-repo');
  const [repository, setRepository] = useState<Repository | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [fromCommit, setFromCommit] = useState<string>('');
  const [toCommit, setToCommit] = useState<string>('');
  const [fromType, setFromType] = useState<'branch' | 'tag'>('branch');
  const [toType, setToType] = useState<'branch' | 'tag'>('branch');
  const [fromBranch, setFromBranch] = useState<string>('HEAD');
  const [toBranch, setToBranch] = useState<string>('HEAD');
  const [branchCommits, setBranchCommits] = useState<Record<string, Commit[]>>({});
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileDiff, setFileDiff] = useState<FileDiff | null>(null);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline'>(settings.defaultViewMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [highlighterEnabled, setHighlighterEnabled] = useState(settings.defaultHighlighterEnabled);
  const [linkHighlights, setLinkHighlights] = useState(settings.defaultLinkHighlights);
  const [linkMode, setLinkMode] = useState<'line-number' | 'visual-position'>(settings.defaultLinkMode);
  const clearHighlightsRef = useRef<(() => void) | null>(null);
  
  // Commit filtering state
  const [commitFilter, setCommitFilter] = useState({
    dateFrom: 'any' as 'any' | 'today' | 'last7' | 'last30' | 'last90' | 'custom',
    dateTo: 'any' as 'any' | 'today' | 'last7' | 'last30' | 'last90' | 'custom',
    customDateFrom: '',
    customDateTo: ''
  });

  // Clear all filters
  const clearFilters = () => {
    setCommitFilter({
      dateFrom: 'any',
      dateTo: 'any',
      customDateFrom: '',
      customDateTo: ''
    });
  };


  // Sidebar resizing state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('code-reviewer-sidebar-width');
    return saved ? parseInt(saved, 10) : 320; // Default 320px = w-80
  });
  const [isResizing, setIsResizing] = useState(false);

  // Save sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('code-reviewer-sidebar-width', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Handle sidebar resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    // Constrain width between 200px and 600px
    const constrainedWidth = Math.min(Math.max(newWidth, 200), 600);
    setSidebarWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add global mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResizing]);


  // Helper function to filter commits by date range
  const filterCommitsByDateRange = (commitList: Commit[], dateFilter: string, customDate: string) => {
    if (dateFilter === 'any') return commitList;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return commitList.filter(commit => {
      const commitDate = new Date(commit.date);
      
      switch (dateFilter) {
        case 'today':
          const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
          return commitDate >= today && commitDate <= endOfToday;
          
        case 'last7':
          const last7Start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
          const endOfToday7 = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
          return commitDate >= last7Start && commitDate <= endOfToday7;
          
        case 'last30':
          const last30Start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
          const endOfToday30 = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
          return commitDate >= last30Start && commitDate <= endOfToday30;
          
        case 'last90':
          const last90Start = new Date(today.getTime() - 89 * 24 * 60 * 60 * 1000);
          const endOfToday90 = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
          return commitDate >= last90Start && commitDate <= endOfToday90;
          
        case 'custom':
          if (!customDate) return true;
          const customDateStart = new Date(customDate);
          const customDateEnd = new Date(customDateStart.getTime() + 24 * 60 * 60 * 1000 - 1);
          return commitDate >= customDateStart && commitDate <= customDateEnd;
          
        default:
          return true;
      }
    });
  };

  // Create filtered commits for FROM and TO selectors
  const fromFilteredCommits = filterCommitsByDateRange(commits, commitFilter.dateFrom, commitFilter.customDateFrom);
  const toFilteredCommits = filterCommitsByDateRange(commits, commitFilter.dateTo, commitFilter.customDateTo);
  
  const fromBranchFilteredCommits = branchCommits[fromBranch] 
    ? filterCommitsByDateRange(branchCommits[fromBranch], commitFilter.dateFrom, commitFilter.customDateFrom)
    : fromFilteredCommits;
    
  const toBranchFilteredCommits = branchCommits[toBranch] 
    ? filterCommitsByDateRange(branchCommits[toBranch], commitFilter.dateTo, commitFilter.customDateTo)
    : toFilteredCommits;

  const cycleLinkMode = () => {
    if (!linkHighlights) {
      setLinkHighlights(true);
      setLinkMode('line-number');
    } else if (linkMode === 'line-number') {
      setLinkMode('visual-position');
    } else {
      setLinkHighlights(false);
      setLinkMode('line-number');
    }
  };

  const getLinkButtonContent = () => {
    if (!linkHighlights) {
      return { icon: Link2Off, text: 'No Link', variant: 'outline' as const };
    } else if (linkMode === 'line-number') {
      return { icon: Hash, text: 'Link Line #', variant: 'default' as const };
    } else {
      return { icon: Eye, text: 'Link Visual', variant: 'default' as const };
    }
  };

  useEffect(() => {
    loadRepository();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const loadRepository = async () => {
    try {
      setLoading(true);
      setError('');
      
      const [repoInfo, commitList] = await Promise.all([
        api.repository.getInfo(repoPath),
        api.commits.list(repoPath, undefined, 50)
      ]);
      
      setRepository(repoInfo);
      setCommits(commitList);
      
      // Set default selections to current branch
      setFromCommit(repoInfo.currentBranch);
      setToCommit(repoInfo.currentBranch);
      setFromBranch(repoInfo.currentBranch);
      setToBranch(repoInfo.currentBranch);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repository');
    } finally {
      setLoading(false);
    }
  };

  const loadBranchCommits = async (branch: string) => {
    if (!repository || branchCommits[branch]) return;
    
    try {
      const commits = await api.commits.list(repoPath, branch, 100);
      setBranchCommits(prev => ({ ...prev, [branch]: commits }));
    } catch (err) {
      console.error(`Failed to load commits for branch ${branch}:`, err);
    }
  };

  const loadFileTree = async () => {
    if (!fromCommit || !toCommit) return;
    
    try {
      setLoading(true);
      setError('');
      
      const tree = await api.files.treeWithChanges(
        repoPath,
        toCommit,
        fromCommit,
        toCommit
      );
      
      setFileTree(tree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file tree');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fromCommit && toCommit) {
      loadFileTree();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCommit, toCommit]);

  const handleFileSelect = async (path: string) => {
    if (!fromCommit || !toCommit) return;
    
    setSelectedFile(path);
    
    // Reset to default settings for new file selection
    setViewMode(settings.defaultViewMode);
    setHighlighterEnabled(settings.defaultHighlighterEnabled);
    setLinkHighlights(settings.defaultLinkHighlights);
    setLinkMode(settings.defaultLinkMode);
    
    try {
      setLoading(true);
      setError('');
      
      const diff = await api.files.diff(
        repoPath,
        fromCommit,
        toCommit,
        path
      );
      
      setFileDiff(diff);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file diff');
      setFileDiff(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            <span className="font-semibold">Code Reviewer</span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(true)}
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Repository Path:</label>
            <Input
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="Enter git repository path"
              className="w-[300px]"
            />
          </div>
          
          <Button onClick={loadRepository} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Load Repository
          </Button>
        </div>
        
        {repository && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                <BranchCommitSelector 
                  label="From"
                  branches={repository.branches}
                  tags={repository.tags || []}
                  commits={fromBranchFilteredCommits}
                  currentBranch={repository.currentBranch}
                  value={fromCommit}
                  onValueChange={(value, type, branch) => {
                    setFromCommit(value);
                    setFromType(type);
                    if (branch) setFromBranch(branch);
                  }}
                  onBranchChange={(branch) => loadBranchCommits(branch)}
                  defaultType={fromType}
                  dateFilter={commitFilter.dateFrom}
                  onDateFilterChange={(filter) => setCommitFilter(prev => ({ ...prev, dateFrom: filter }))}
                  customDate={commitFilter.customDateFrom}
                  onCustomDateChange={(date) => setCommitFilter(prev => ({ ...prev, customDateFrom: date }))}
                />
                
                <BranchCommitSelector 
                  label="To"
                  branches={repository.branches}
                  tags={repository.tags || []}
                  commits={toBranchFilteredCommits}
                  currentBranch={repository.currentBranch}
                  value={toCommit}
                  onValueChange={(value, type, branch) => {
                    setToCommit(value);
                    setToType(type);
                    if (branch) setToBranch(branch);
                  }}
                  onBranchChange={(branch) => loadBranchCommits(branch)}
                  defaultType={toType}
                  dateFilter={commitFilter.dateTo}
                  onDateFilterChange={(filter) => setCommitFilter(prev => ({ ...prev, dateTo: filter }))}
                  customDate={commitFilter.customDateTo}
                  onCustomDateChange={(date) => setCommitFilter(prev => ({ ...prev, customDateTo: date }))}
                />
              </div>
              
            </div>
            
          </>
        )}
      </header>
      
      {error && (
        <div className="border-b bg-destructive/10 px-4 py-2 text-destructive">
          {error}
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        <aside 
          className="border-r relative flex"
          style={{ width: sidebarWidth }}
        >
          <div className="flex-1 overflow-hidden">
            {fileTree ? (
              <FileBrowser
                fileTree={fileTree}
                selectedFile={selectedFile}
                onFileSelect={handleFileSelect}
              />
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                {loading ? 'Loading...' : 'Select commits to view changes'}
              </div>
            )}
          </div>
          
          {/* Resize handle */}
          <div
            className={cn(
              "w-1 bg-border hover:bg-accent-foreground/20 cursor-col-resize transition-colors flex items-center justify-center group relative",
              isResizing && "bg-accent-foreground/20"
            )}
            onMouseDown={handleMouseDown}
          >
            {/* Wider hover area for easier grabbing */}
            <div className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize" />
            <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors relative z-10" />
          </div>
        </aside>
        
        <main className="flex-1 overflow-hidden min-h-0">
          {fileDiff ? (
            (() => {
              const hasNoChanges = fileDiff.hunks.length === 0 && fileDiff.oldContent === fileDiff.newContent;
              
              if (hasNoChanges) {
                return (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between m-2">
                      <div className="text-sm text-muted-foreground">Unchanged File</div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={highlighterEnabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => setHighlighterEnabled(!highlighterEnabled)}
                          className="flex items-center gap-2"
                        >
                          <Highlighter className="h-4 w-4" />
                          Highlighter
                        </Button>
                        {highlighterEnabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => clearHighlightsRef.current?.()}
                            className="flex items-center gap-2"
                          >
                            <Eraser className="h-4 w-4" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-h-0">
                      <DiffViewer diff={fileDiff} viewMode={viewMode} highlighterEnabled={highlighterEnabled} linkHighlights={linkHighlights} linkMode={linkMode} clearHighlightsRef={clearHighlightsRef} />
                    </div>
                  </div>
                );
              }
              
              return (
                <div className="flex flex-col h-full min-h-0">
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'side-by-side' | 'inline')} className="flex flex-col h-full min-h-0">
                    <div className="flex items-center justify-between m-2 shrink-0">
                      <TabsList>
                        <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                        <TabsTrigger value="inline">Inline</TabsTrigger>
                      </TabsList>
                      <div className="flex items-center gap-2">
                        <Button
                          variant={highlighterEnabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => setHighlighterEnabled(!highlighterEnabled)}
                          className="flex items-center gap-2"
                        >
                          <Highlighter className="h-4 w-4" />
                          Highlighter
                        </Button>
                        {highlighterEnabled && (
                          <>
                            {viewMode === 'side-by-side' && (() => {
                              const linkContent = getLinkButtonContent();
                              return (
                                <Button
                                  variant={linkContent.variant}
                                  size="sm"
                                  onClick={cycleLinkMode}
                                  className="flex items-center gap-2"
                                >
                                  <linkContent.icon className="h-4 w-4" />
                                  {linkContent.text}
                                </Button>
                              );
                            })()}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => clearHighlightsRef.current?.()}
                              className="flex items-center gap-2"
                            >
                              <Eraser className="h-4 w-4" />
                              Clear
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <TabsContent value={viewMode} className="flex-1 m-0 min-h-0">
                      <DiffViewer 
                        diff={fileDiff} 
                        viewMode={viewMode} 
                        highlighterEnabled={highlighterEnabled}
                        linkHighlights={linkHighlights}
                        linkMode={linkMode}
                        clearHighlightsRef={clearHighlightsRef}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              );
            })()
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              {selectedFile ? 'Loading...' : 'Select a file to view changes'}
            </div>
          )}
        </main>
      </div>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  );
}

export default App;