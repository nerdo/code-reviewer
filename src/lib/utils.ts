import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function expandTabs(text: string, tabSize: number): string {
  if (!text.includes('\t')) {
    return text; // Early return if no tabs
  }
  
  let result = '';
  let column = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\t') {
      // Calculate spaces needed to reach next tab stop
      const spacesToAdd = tabSize - (column % tabSize);
      result += ' '.repeat(spacesToAdd);
      column += spacesToAdd;
    } else {
      result += char;
      column++;
    }
  }
  
  return result;
}