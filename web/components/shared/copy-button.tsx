'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toastError, toastSuccess } from '@/lib/toast';

export interface CopyButtonProps {
  value: string;
  /** The visible label (secondary) or the aria-label (ghost). */
  label?: string;
  /** The success toast. */
  message?: string;
  /** `ghost`: the 40px icon button (the summary well's short link); `secondary`: a 48px pill. */
  variant?: 'ghost' | 'secondary';
  /** What it sits on, for the hover fill and outline (see buttonVariants). */
  surface?: 'white' | 'glass' | 'card';
  className?: string;
}

/** Copies `value`, confirms with a toast and shows a check for two seconds. */
export function CopyButton({
  value,
  label = 'Copy',
  message = 'Copied to clipboard',
  variant = 'ghost',
  surface = 'white',
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toastSuccess(message);
    } catch (error) {
      toastError(error, { fallback: 'Could not copy. Select the text and copy it instead.' });
    }
  }

  const icon = copied ? <Check /> : <Copy />;
  if (variant === 'ghost') {
    return (
      <Button
        variant="ghost"
        surface={surface}
        aria-label={label}
        onClick={copy}
        className={className}
      >
        {icon}
      </Button>
    );
  }
  return (
    <Button variant="secondary" surface={surface} icon={icon} onClick={copy} className={className}>
      {label}
    </Button>
  );
}
