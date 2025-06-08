import React, { useState, useRef, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutocompleteSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  renderOption?: (option: string) => React.ReactNode;
  currentItem?: string; // Special item to show first (like current branch)
}

export function AutocompleteSelect({
  value,
  onValueChange,
  options,
  placeholder = "Type to search...",
  className,
  renderOption,
  currentItem
}: AutocompleteSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(''); // Separate input from selected value
  const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
    setHighlightedIndex(-1);
  }, [inputValue, options]);

  // Don't update input when value changes externally - keep them separate

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
  };

  const handleOptionSelect = (option: string) => {
    setInputValue(''); // Clear input after selection
    onValueChange(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay closing to allow option clicks
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length === 1) {
          handleOptionSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const clearInput = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  // Sort options to show current item first
  const sortedOptions = React.useMemo(() => {
    if (!currentItem) return filteredOptions;
    
    const withoutCurrent = filteredOptions.filter(opt => opt !== currentItem);
    const hasCurrent = filteredOptions.includes(currentItem);
    
    return hasCurrent ? [currentItem, ...withoutCurrent] : filteredOptions;
  }, [filteredOptions, currentItem]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={value || placeholder}
          className="pr-16"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearInput}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
          </Button>
        </div>
      </div>

      {isOpen && (
        <div 
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {sortedOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            sortedOptions.map((option, index) => (
              <div
                key={option}
                className={cn(
                  "px-3 py-2 cursor-pointer text-sm hover:bg-accent transition-colors",
                  index === highlightedIndex && "bg-accent",
                  option === currentItem && "font-medium"
                )}
                onClick={() => handleOptionSelect(option)}
              >
                {renderOption ? renderOption(option) : (
                  <span>
                    {option}
                    {option === currentItem && " (current)"}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}