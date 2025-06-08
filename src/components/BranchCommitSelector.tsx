import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { AutocompleteSelect } from './AutocompleteSelect';
import { GitBranch, Tag, GitCommit } from 'lucide-react';
import { Commit } from '@/domain/entities/Commit';

type ReferenceType = 'branch' | 'tag';

interface BranchCommitSelectorProps {
  label: string;
  branches: string[];
  tags: string[];
  commits: Commit[];
  currentBranch: string;
  value: string;
  onValueChange: (value: string, type: ReferenceType, branch?: string) => void;
  onBranchChange?: (branch: string) => void;
  defaultType?: ReferenceType;
}

export function BranchCommitSelector({ 
  label, 
  branches, 
  tags, 
  commits, 
  currentBranch,
  value, 
  onValueChange,
  onBranchChange,
  defaultType = 'branch'
}: BranchCommitSelectorProps) {
  const [referenceType, setReferenceType] = useState<ReferenceType>(defaultType);
  const [selectedBranch, setSelectedBranch] = useState<string>(currentBranch);
  const [selectedCommit, setSelectedCommit] = useState<string>('HEAD');

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    setSelectedCommit('HEAD'); // Reset to HEAD when branch changes
    onValueChange(branch, 'branch', branch);
    onBranchChange?.(branch);
  };

  const handleCommitChange = (commitHash: string) => {
    setSelectedCommit(commitHash);
    // If HEAD is selected, use the branch name, otherwise use the commit hash
    const valueToSend = commitHash === 'HEAD' ? selectedBranch : commitHash;
    onValueChange(valueToSend, 'branch', selectedBranch);
  };

  const handleTagChange = (tag: string) => {
    onValueChange(tag, 'tag');
  };

  const handleTypeChange = (newType: ReferenceType) => {
    setReferenceType(newType);
    
    // Set smart defaults when switching types
    if (newType === 'branch') {
      setSelectedBranch(currentBranch);
      setSelectedCommit('HEAD');
      onValueChange(currentBranch, 'branch', currentBranch);
    } else if (newType === 'tag' && tags.length > 0) {
      onValueChange(tags[0], 'tag');
    }
  };


  const renderSelector = () => {
    switch (referenceType) {
      case 'branch':
        return (
          <div className="flex items-center gap-2">
            <AutocompleteSelect
              value={selectedBranch}
              onValueChange={handleBranchChange}
              options={branches}
              placeholder="Type branch name..."
              className="w-[200px]"
              currentItem={currentBranch}
              renderOption={(branch) => (
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span>{branch}</span>
                </div>
              )}
            />

            {selectedBranch && (
              <>
                <span className="text-sm text-muted-foreground">at</span>
                <Select value={selectedCommit} onValueChange={handleCommitChange}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-w-[280px]">
                    <SelectItem value="HEAD">
                      <div className="flex items-center gap-2">
                        <GitCommit className="h-4 w-4" />
                        <span className="font-medium">HEAD (latest)</span>
                      </div>
                    </SelectItem>
                    {commits.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Loading commits...
                      </div>
                    ) : (
                      commits.map((commit) => (
                        <SelectItem key={commit.hash} value={commit.hash}>
                          <div className="flex flex-col gap-1 py-1 min-w-0 max-w-[250px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <GitCommit className="h-4 w-4 flex-shrink-0" />
                              <span className="font-mono text-xs flex-shrink-0">{commit.hash.substring(0, 7)}</span>
                              <span className="text-sm truncate">{commit.message}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                              <span className="truncate">{commit.author}</span>
                              <span className="flex-shrink-0">•</span>
                              <span className="flex-shrink-0">
                                {new Date(commit.date).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        );

      case 'tag':
        return (
          <AutocompleteSelect
            value={value}
            onValueChange={handleTagChange}
            options={tags}
            placeholder={tags.length === 0 ? "No tags available" : "Type tag name..."}
            className="w-[300px]"
            renderOption={(tag) => (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span>{tag}</span>
              </div>
            )}
          />
        );
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">{label}:</label>
      <div className="flex items-center gap-2">
        <Tabs value={referenceType} onValueChange={(v) => handleTypeChange(v as ReferenceType)}>
          <TabsList className="h-8">
            <TabsTrigger value="branch" className="text-xs px-2 py-1">
              <GitBranch className="h-3 w-3 mr-1" />
              Branch
            </TabsTrigger>
            <TabsTrigger value="tag" className="text-xs px-2 py-1">
              <Tag className="h-3 w-3 mr-1" />
              Tag
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {renderSelector()}
      </div>
    </div>
  );
}