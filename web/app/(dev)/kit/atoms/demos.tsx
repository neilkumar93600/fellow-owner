'use client';

import type { IdeasPage } from '@fellow-owners/shared';
import { LayoutGrid, ListOrdered, Plus } from 'lucide-react';
import { useState } from 'react';
import { AiChip, type AiChipKind } from '@/components/shared/ai-chip';
import { CountChips } from '@/components/shared/count-chips';
import { Pagination } from '@/components/shared/pagination';
import { SegmentedPill } from '@/components/shared/segmented-pill';
import { SearchSquare, Toolbar } from '@/components/shared/toolbar';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

// TEMPORARY: the interactive half of the dev-only atoms gallery (page.tsx); delete with it.

const SORTS = [
  { value: 'fit', label: 'Fit' },
  { value: 'newest', label: 'Newest' },
] as const;

const VIEWS = [
  { value: 'ranked', label: 'Ranked', icon: ListOrdered },
  { value: 'board', label: 'Board', icon: LayoutGrid },
] as const;

export function GlassDemos({ counts, total }: { counts: IdeasPage['counts']; total: number }) {
  const [fans, setFans] = useState('');
  const [messages, setMessages] = useState('');
  const [sort, setSort] = useState<'fit' | 'newest'>('fit');
  const [community, setCommunity] = useState('all');
  const [view, setView] = useState<'ranked' | 'board'>('ranked');
  const [page, setPage] = useState(1);
  const [shortPage, setShortPage] = useState(2);

  const chips = [{ slug: 'all', name: 'All', count: total }, ...counts].map((c) => ({
    key: c.slug,
    label: c.name,
    count: c.count,
    active: community === c.slug,
    onSelect: () => setCommunity(c.slug),
  }));

  return (
    <>
      <Toolbar
        title="Fans"
        end={
          <SearchSquare
            value={fans}
            onChange={setFans}
            label="Search fans by skill"
            placeholder="Search by skill"
          />
        }
      />
      <Toolbar
        start={
          <Button variant="secondary" surface="glass" size="md" trailingIcon={<Plus />}>
            Add community
          </Button>
        }
        end={
          <>
            <SearchSquare
              value={messages}
              onChange={setMessages}
              label="Search messages"
              placeholder="Search messages"
            />
            <Select label="Sort" showLabel options={SORTS} value={sort} onValueChange={setSort} />
          </>
        }
      />
      <CountChips label="Filter ideas by community" chips={chips} />
      <div className="flex flex-wrap items-center gap-4">
        <SegmentedPill label="Ideas view" options={VIEWS} value={view} onChange={setView} />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Pagination page={page} pageCount={12} onPageChange={setPage} label="Fans pages" />
        <Pagination
          page={shortPage}
          pageCount={4}
          onPageChange={setShortPage}
          label="Message pages"
        />
      </div>
    </>
  );
}

/** The four AI chip kinds; Retry flips the chip to "AI reviewing", as the real mutation will. */
export function AiChipDemo() {
  const [retry, setRetry] = useState<AiChipKind>('not-analyzed');
  return (
    <>
      <AiChip kind="pick" />
      <AiChip kind="suggested" />
      <AiChip kind="reviewing" />
      <AiChip kind={retry} onRetry={() => setRetry('reviewing')} />
    </>
  );
}
