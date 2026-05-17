// cn — class name helper
// Combines clsx (conditional classes) with tailwind-merge (deduplication).
// Use everywhere instead of string concatenation.
//
// Usage:
//   cn('text-base', isActive && 'font-semibold', className)

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
