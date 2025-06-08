import { useState, useEffect, useRef } from 'react';
import { FileBrowser } from './components/FileBrowser';
import { DiffViewer } from './components/DiffViewer';
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
import { GitBranch, RefreshCw, Settings, Highlighter, Link2Off, Hash, Eye, Eraser } from 'lucide-react';
import { cn } from './lib/utils';
import { useSettings } from './components/settings-provider';

function App() {
  const { settings } = useSettings();
  const [repoPath, setRepoPath] = useState<string>('./test-repo');
  const [repository, setRepository] = useState<Repository | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [fromCommit, setFromCommit] = useState<string>('');
  const [toCommit, setToCommit] = useState<string>('');
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
      
      if (commitList.length >= 2) {
        setFromCommit(commitList[1].hash);
        setToCommit(commitList[0].hash);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repository');
    } finally {
      setLoading(false);
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            <span className="font-semibold">Code Reviewer</span>
          </div>
          
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
          
          <div className="ml-auto flex items-center gap-2">
            {repository && (
              <span className="text-sm text-muted-foreground">
                Branch: {repository.currentBranch}
              </span>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
        
        {repository && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">From:</label>
              <Select value={fromCommit} onValueChange={setFromCommit}>
                <SelectTrigger className="w-[400px]">
                  <SelectValue placeholder="Select base commit" />
                </SelectTrigger>
                <SelectContent>
                  {commits.map((commit) => (
                    <SelectItem key={commit.hash} value={commit.hash}>
                      <div className="flex flex-col gap-1 py-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{commit.hash.substring(0, 7)}</span>
                          <span className="text-sm">{commit.message.substring(0, 60)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{commit.author}</span>
                          <span>•</span>
                          <span>{new Date(commit.date).toLocaleDateString()} {new Date(commit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">To:</label>
              <Select value={toCommit} onValueChange={setToCommit}>
                <SelectTrigger className="w-[400px]">
                  <SelectValue placeholder="Select target commit" />
                </SelectTrigger>
                <SelectContent>
                  {commits.map((commit) => (
                    <SelectItem key={commit.hash} value={commit.hash}>
                      <div className="flex flex-col gap-1 py-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{commit.hash.substring(0, 7)}</span>
                          <span className="text-sm">{commit.message.substring(0, 60)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{commit.author}</span>
                          <span>•</span>
                          <span>{new Date(commit.date).toLocaleDateString()} {new Date(commit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </header>
      
      {error && (
        <div className="border-b bg-destructive/10 px-4 py-2 text-destructive">
          {error}
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r">
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
        </aside>
        
        <main className="flex-1">
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
                    <div className="flex-1">
                      <DiffViewer diff={fileDiff} viewMode={viewMode} highlighterEnabled={highlighterEnabled} linkHighlights={linkHighlights} linkMode={linkMode} clearHighlightsRef={clearHighlightsRef} />
                    </div>
                  </div>
                );
              }
              
              return (
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'side-by-side' | 'inline')}>
                  <div className="flex items-center justify-between m-2">
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
                  <TabsContent value={viewMode} className="h-[calc(100%-64px)] m-0">
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