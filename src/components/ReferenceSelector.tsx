import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { GitBranch, Tag, GitCommit } from 'lucide-react';
import { Commit } from '@/domain/entities/Commit';

type ReferenceType = 'branch' | 'tag' | 'commit';

interface ReferenceSelectorProps {
  label: string;
  branches: string[];
  tags: string[];
  commits: Commit[];
  value: string;
  onValueChange: (value: string, type: ReferenceType) => void;
  defaultType?: ReferenceType;
}

export function ReferenceSelector({ 
  label, 
  branches, 
  tags, 
  commits, 
  value, 
  onValueChange,
  defaultType = 'commit'
}: ReferenceSelectorProps) {
  const [referenceType, setReferenceType] = useState<ReferenceType>(defaultType);

  const handleValueChange = (newValue: string) => {
    onValueChange(newValue, referenceType);
  };

  const handleTypeChange = (newType: ReferenceType) => {
    setReferenceType(newType);
    
    // Set smart defaults when switching types
    if (newType === 'branch' && branches.length > 0) {
      onValueChange('HEAD', newType);
    } else if (newType === 'commit' && commits.length > 0) {
      onValueChange(commits[0].hash, newType);
    } else if (newType === 'tag' && tags.length > 0) {
      onValueChange(tags[0], newType);
    }
  };

  const renderSelector = () => {
    switch (referenceType) {
      case 'branch':
        return (
          <Select value={value} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[400px]">
              <SelectValue placeholder={`Select ${label.toLowerCase()} branch`} />
            </SelectTrigger>
            <SelectContent className="max-w-[400px]">
              <SelectItem value="HEAD">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span className="font-medium">HEAD (current branch)</span>
                </div>
              </SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    <span>{branch}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'tag':
        return (
          <Select value={value} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[400px]">
              <SelectValue placeholder={`Select ${label.toLowerCase()} tag`} />
            </SelectTrigger>
            <SelectContent className="max-w-[400px]">
              {tags.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No tags available
                </div>
              ) : (
                tags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>{tag}</span>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        );

      case 'commit':
        return (
          <Select value={value} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[400px]">
              <SelectValue placeholder={`Select ${label.toLowerCase()} commit`} />
            </SelectTrigger>
            <SelectContent className="max-w-[400px]">
              {commits.map((commit) => (
                <SelectItem key={commit.hash} value={commit.hash}>
                  <div className="flex flex-col gap-1 py-1 min-w-0 max-w-[350px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitCommit className="h-4 w-4 flex-shrink-0" />
                      <span className="font-mono text-xs flex-shrink-0">{commit.hash.substring(0, 7)}</span>
                      <span className="text-sm truncate">{commit.message}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                      <span className="truncate">{commit.author}</span>
                      <span className="flex-shrink-0">•</span>
                      <span className="flex-shrink-0">
                        {new Date(commit.date).toLocaleDateString()} {new Date(commit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <TabsTrigger value="commit" className="text-xs px-2 py-1">
              <GitCommit className="h-3 w-3 mr-1" />
              Commit
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {renderSelector()}
      </div>
    </div>
  );
}