import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { AutocompleteSelect } from './AutocompleteSelect';
import { GitBranch, Tag, GitCommit, Calendar } from 'lucide-react';
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
  dateFilter?: 'any' | 'today' | 'last7' | 'last30' | 'last90' | 'custom';
  onDateFilterChange?: (filter: 'any' | 'today' | 'last7' | 'last30' | 'last90' | 'custom') => void;
  customDate?: string;
  onCustomDateChange?: (date: string) => void;
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
  defaultType = 'branch',
  dateFilter = 'any',
  onDateFilterChange,
  customDate = '',
  onCustomDateChange
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
          <div className="flex flex-col gap-2">
            {/* First line: Branch/Tag selection */}
            <div className="flex items-center gap-2">
              <AutocompleteSelect
                value={selectedBranch}
                onValueChange={handleBranchChange}
                options={branches}
                placeholder="Type branch name..."
                className="w-[400px]"
                currentItem={currentBranch}
                renderOption={(branch) => (
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    <span>{branch}</span>
                  </div>
                )}
              />
            </div>

            {/* Second line: Commit selection and date filter */}
            {selectedBranch && (
              <div className="flex items-center gap-2">
                <AutocompleteSelect
                  value={selectedCommit === 'HEAD' ? 'HEAD' : selectedCommit}
                  onValueChange={handleCommitChange}
                  options={['HEAD', ...commits.map(c => c.hash)]}
                  placeholder="Type to search commits..."
                  className="flex-1 min-w-[500px]"
                  getDisplayValue={(value) => {
                    if (value === 'HEAD') {
                      return 'HEAD (latest)';
                    }
                    
                    const commit = commits.find(c => c.hash === value);
                    if (!commit) return value;
                    
                    const shortHash = commit.hash.substring(0, 7);
                    const truncatedMessage = commit.message.length > 60 
                      ? commit.message.substring(0, 60) + '...' 
                      : commit.message;
                    const shortDate = new Date(commit.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
                    
                    return `[${shortHash}] ${truncatedMessage} • ${commit.author} • ${shortDate}`;
                  }}
                  filterFunction={(option, inputValue) => {
                    if (option === 'HEAD') {
                      return 'HEAD'.toLowerCase().includes(inputValue.toLowerCase()) ||
                             'latest'.toLowerCase().includes(inputValue.toLowerCase());
                    }
                    
                    const commit = commits.find(c => c.hash === option);
                    if (!commit) return false;
                    
                    const searchTerm = inputValue.toLowerCase();
                    const commitDate = new Date(commit.date);
                    
                    // Format dates for searching
                    const fullDate = commitDate.toLocaleDateString(); // e.g., "12/25/2023"
                    const isoDate = commitDate.toISOString().split('T')[0]; // e.g., "2023-12-25"
                    const readableDate = commitDate.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    }); // e.g., "Dec 25, 2023"
                    
                    return commit.hash.toLowerCase().includes(searchTerm) ||
                           commit.message.toLowerCase().includes(searchTerm) ||
                           commit.author.toLowerCase().includes(searchTerm) ||
                           fullDate.includes(searchTerm) ||
                           isoDate.includes(searchTerm) ||
                           readableDate.toLowerCase().includes(searchTerm);
                  }}
                  renderOption={(option) => {
                    if (option === 'HEAD') {
                      return (
                        <div className="flex items-center gap-2 py-2">
                          <GitCommit className="h-4 w-4" />
                          <span className="font-medium">HEAD (latest)</span>
                        </div>
                      );
                    }
                    
                    const commit = commits.find(c => c.hash === option);
                    if (!commit) return <span>{option}</span>;
                    
                    return (
                      <div className="flex flex-col gap-1 py-2 min-w-0 max-w-[500px]">
                        <div className="flex items-center gap-2 min-w-0">
                          <GitCommit className="h-4 w-4 flex-shrink-0" />
                          <span className="font-mono text-xs flex-shrink-0">{commit.hash.substring(0, 7)}</span>
                          <span className="text-sm truncate">{commit.message}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 ml-6">
                          <span className="truncate">{commit.author}</span>
                          <span className="flex-shrink-0">•</span>
                          <span className="flex-shrink-0">
                            {new Date(commit.date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                
                {onDateFilterChange && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <Select 
                      value={dateFilter} 
                      onValueChange={(value: string) => onDateFilterChange(value as any)}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="last7">Last 7 days</SelectItem>
                        <SelectItem value="last30">Last 30 days</SelectItem>
                        <SelectItem value="last90">Last 3 months</SelectItem>
                        <SelectItem value="custom">Custom date...</SelectItem>
                      </SelectContent>
                    </Select>
                    {dateFilter === 'custom' && onCustomDateChange && (
                      <Input
                        type="date"
                        value={customDate}
                        onChange={(e) => onCustomDateChange(e.target.value)}
                        className="w-[120px] h-8 text-xs"
                      />
                    )}
                  </div>
                )}
              </div>
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
            className="w-[400px]"
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