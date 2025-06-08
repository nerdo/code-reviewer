import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Commit } from '@/domain/entities/Commit';

interface CommitSelectorProps {
  label: string;
  commits: Commit[];
  value: string;
  onValueChange: (value: string) => void;
}

export function CommitSelector({ label, commits, value, onValueChange }: CommitSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-muted-foreground">{label}:</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[400px]">
          <SelectValue placeholder={`Select ${label.toLowerCase()} commit`} />
        </SelectTrigger>
        <SelectContent className="max-w-[400px]">
          {commits.map((commit) => (
            <SelectItem key={commit.hash} value={commit.hash}>
              <div className="flex flex-col gap-1 py-1 min-w-0 max-w-[350px]">
                <div className="flex items-center gap-2 min-w-0">
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
    </div>
  );
}