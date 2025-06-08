import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "./ui/scroll-area"
import { cn, expandTabs } from "@/lib/utils"
import { useSettings, type Settings } from "./settings-provider"
import { FileDiff } from "@/domain/entities/FileDiff"

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettings()
  const [tempSettings, setTempSettings] = useState<Settings>(settings)

  // Reset temp settings when dialog opens
  useEffect(() => {
    if (open) {
      setTempSettings(settings)
    }
  }, [open, settings])

  const handleConfirm = () => {
    updateSettings(tempSettings)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setTempSettings(settings) // Reset to original settings
    onOpenChange(false)
  }

  const previewDiff: FileDiff = {
    path: 'example.ts',
    oldContent: 'function calculateTotal(items: Item[]) {\n  let total = 0;\n  for (const item of items) {\n    total += item.price;\n  }\n  return total;\n}',
    newContent: 'function calculateTotal(items: Item[]) {\n  return items.reduce((total, item) => total + item.price, 0);\n}',
    isBinary: false,
    hunks: [
      {
        oldStart: 1,
        oldLines: 6,
        newStart: 1,
        newLines: 2,
        lines: [
          { type: 'normal' as const, content: 'function calculateTotal(items: Item[]) {', oldLineNumber: 1, newLineNumber: 1 },
          { type: 'delete' as const, content: '\tlet total = 0;\t// Initialize', oldLineNumber: 2 },
          { type: 'delete' as const, content: '\tfor (const item of items) {', oldLineNumber: 3 },
          { type: 'delete' as const, content: '\t\ttotal += item.price;\t// Add price', oldLineNumber: 4 },
          { type: 'delete' as const, content: '\t}', oldLineNumber: 5 },
          { type: 'delete' as const, content: '\treturn total;\t// Return sum', oldLineNumber: 6 },
          { type: 'add' as const, content: '\treturn items.reduce((total, item) => total + item.price, 0);\t// One-liner', newLineNumber: 2 },
          { type: 'normal' as const, content: '}', oldLineNumber: 7, newLineNumber: 3 }
        ]
      }
    ]
  }

  // Preview component that uses temp settings instead of global settings
  const PreviewDiffViewer = () => {
    return (
      <ScrollArea className="h-full">
        <div className="font-mono text-sm" style={{ lineHeight: tempSettings.lineHeight }}>
          {previewDiff.hunks.map((hunk, hunkIndex) => (
            <div key={hunkIndex} className="border-b last:border-b-0">
              <div className="bg-muted px-4 py-2 text-muted-foreground">
                @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
              </div>
              {hunk.lines.map((line, lineIndex) => (
                <div
                  key={lineIndex}
                  className={cn(
                    "flex",
                    line.type === 'add' && "bg-green-500/20 text-green-700 dark:text-green-400",
                    line.type === 'delete' && "bg-red-500/20 text-red-700 dark:text-red-400"
                  )}
                >
                  <span className="w-12 select-none bg-muted px-2 py-0.5 text-right text-muted-foreground">
                    {line.oldLineNumber || line.newLineNumber || ''}
                  </span>
                  <span className="w-4 select-none px-2 py-0.5 text-muted-foreground">
                    {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                  </span>
                  <span className="flex-1 px-2 py-0.5 whitespace-pre">
                    {expandTabs(line.content, tempSettings.tabSize)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your preferences for the code reviewer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 gap-6 overflow-hidden">
          <div className="w-1/2">
            <Tabs defaultValue="appearance" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="defaults">Defaults</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-auto mt-4">
                <TabsContent value="appearance" className="space-y-6 mt-0">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Theme</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                          <span className="ml-2 capitalize">{tempSettings.theme}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setTempSettings(prev => ({ ...prev, theme: "light" }))}>
                          Light
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTempSettings(prev => ({ ...prev, theme: "dark" }))}>
                          Dark
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTempSettings(prev => ({ ...prev, theme: "system" }))}>
                          System
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Line Height: {tempSettings.lineHeight}
                    </Label>
                    <Slider
                      value={[tempSettings.lineHeight]}
                      onValueChange={([value]) => setTempSettings(prev => ({ ...prev, lineHeight: value }))}
                      max={2.5}
                      min={1.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Compact (1.0)</span>
                      <span>Spacious (2.5)</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="editor" className="space-y-6 mt-0">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">
                      Tab Size: {tempSettings.tabSize} spaces
                    </Label>
                    <Slider
                      value={[tempSettings.tabSize]}
                      onValueChange={([value]) => setTempSettings(prev => ({ ...prev, tabSize: value }))}
                      max={8}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 space</span>
                      <span>8 spaces</span>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="defaults" className="space-y-6 mt-0">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Default View Mode</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <span className="capitalize">{tempSettings.defaultViewMode === 'side-by-side' ? 'Side by Side' : 'Inline'}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => setTempSettings(prev => ({ ...prev, defaultViewMode: "side-by-side" }))}>
                          Side by Side
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTempSettings(prev => ({ ...prev, defaultViewMode: "inline" }))}>
                          Inline
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Highlighter Defaults</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Enable by default</span>
                        <Button
                          variant={tempSettings.defaultHighlighterEnabled ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTempSettings(prev => ({ ...prev, defaultHighlighterEnabled: !prev.defaultHighlighterEnabled }))}
                        >
                          {tempSettings.defaultHighlighterEnabled ? "On" : "Off"}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Link highlights by default</span>
                        <Button
                          variant={tempSettings.defaultLinkHighlights ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTempSettings(prev => ({ ...prev, defaultLinkHighlights: !prev.defaultLinkHighlights }))}
                        >
                          {tempSettings.defaultLinkHighlights ? "On" : "Off"}
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Default link mode</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                              <span>{tempSettings.defaultLinkMode === 'line-number' ? 'Link Line #' : 'Link Visual'}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => setTempSettings(prev => ({ ...prev, defaultLinkMode: "line-number" }))}>
                              Link Line #
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTempSettings(prev => ({ ...prev, defaultLinkMode: "visual-position" }))}>
                              Link Visual
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="flex-1 space-y-3">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="border rounded-lg overflow-hidden h-full">
              <PreviewDiffViewer />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Apply Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}