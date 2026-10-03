'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number | null;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, ...props }, ref) => {
    const v = value || 0;
    const m = max || 100;
    const pct = Math.min(100, Math.max(0, (v / m) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={v}
        aria-valuemax={m}
        aria-valuemin={0}
        className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
        {...props}
      >
        <div
          className="h-full flex-1 bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress };
