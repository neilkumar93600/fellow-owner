'use client';

import { Plus } from 'lucide-react';
import type * as React from 'react';
import { useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import st from './faq.module.css';

export interface FaqEntry {
  q: string;
  a: string;
}

/**
 * FAQ accordion (WAI-ARIA accordion pattern). Each question is a button inside an h3 with aria-expanded
 * and aria-controls; each answer is a region labelled by its button. Items open independently (the first
 * starts open), so opening one never moves the question under the pointer. Up/Down/Home/End move focus
 * between questions. The open and close is CSS: grid-template-rows 0fr to 1fr over 250ms ease-out-quart,
 * and the answer fades and settles 6px. Closed answers use visibility: hidden, so they leave the
 * accessibility tree but stay in the server HTML.
 */
export function FaqAccordion({
  items,
  className,
}: {
  items: readonly FaqEntry[];
  className?: string;
}) {
  const baseId = useId();
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  function toggle(index: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = items.length - 1;
    let to: number;
    switch (event.key) {
      case 'ArrowDown':
        to = index === last ? 0 : index + 1;
        break;
      case 'ArrowUp':
        to = index === 0 ? last : index - 1;
        break;
      case 'Home':
        to = 0;
        break;
      case 'End':
        to = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    buttons.current[to]?.focus();
  }

  return (
    <div className={cn(st.list, className)}>
      {items.map((item, index) => {
        const isOpen = open.has(index);
        const buttonId = `${baseId}-q${index}`;
        const panelId = `${baseId}-a${index}`;
        return (
          <div key={item.q} className={st.item} data-open={isOpen ? '' : undefined}>
            <h3 className={st.q}>
              <button
                ref={(el) => {
                  buttons.current[index] = el;
                }}
                id={buttonId}
                type="button"
                className={st.trigger}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                <span className={st.qText}>{item.q}</span>
                <span className={st.icon} aria-hidden="true">
                  <Plus size={18} strokeWidth={1.5} />
                </span>
              </button>
            </h3>
            {/* A section with an accessible name is a region landmark (role="region"). */}
            <section id={panelId} aria-labelledby={buttonId} className={st.panel} data-faq-panel="">
              <div className={st.panelInner}>
                <p className={st.answer}>{item.a}</p>
              </div>
            </section>
          </div>
        );
      })}
    </div>
  );
}
