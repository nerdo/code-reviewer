import React from 'react';
import { Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface CommitFilterProps {
  authorFilter: string;
  searchFilter: string;
  onAuthorFilterChange: (value: string) => void;
  onSearchFilterChange: (value: string) => void;
  uniqueAuthors: string[];
}

export function CommitFilter({ 
  authorFilter, 
  searchFilter, 
  onAuthorFilterChange, 
  onSearchFilterChange, 
  uniqueAuthors 
}: CommitFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <Search className="h-4 w-4 text-muted-foreground" />
      <Select value={authorFilter} onValueChange={onAuthorFilterChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All authors" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All authors</SelectItem>
          {uniqueAuthors.map((author) => (
            <SelectItem key={author} value={author}>
              {author}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative">
        <Input
          type="text"
          placeholder="Filter commits..."
          value={searchFilter}
          onChange={(e) => onSearchFilterChange(e.target.value)}
          className="w-[300px] pr-8"
        />
        {searchFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchFilterChange('')}
            className="absolute right-0 top-0 h-full px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}