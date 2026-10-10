import { ArrowUp, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { longDate } from '@/components/marketing/page-frame';
import { cn } from '@/components/ui/cn';
import { type LEGAL_PAGES, OPERATOR, readingMinutes } from '@/lib/legal';

/*
 * The legal pages as a policy hub (DESIGN.md Golden Hour Frost): a pale aurora band with the serif title,
 * a frosted pill row that links the three policies, then one frosted panel of numbered sections. From 1024px
 * each section is two columns, the number and serif heading on the left (sticky while its section scrolls)
 * and the text on the right behind a dotted divider; below that they stack. Section numbers are CSS counters,
 * so adding or moving a section renumbers the page and nothing is typed twice. Server components throughout.
 */

type LegalPath = (typeof LEGAL_PAGES)[number]['href'];

/** The policy pills, in the order people read them. */
const TABS: readonly { href: LegalPath; label: string }[] = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy-policy', label: 'Privacy' },
  { href: '/cookies', label: 'Cookies' },
];

/** A soft white card for use inside the panel. */
const CARD = 'rounded-3xl border border-white/70 bg-white/60';

/** Comfortable reading: 16px on a 1.6 line, capped near 75 characters wide. */
const PROSE = 'max-w-[75ch] text-base leading-[1.6] text-ink';

const LINK =
  'rounded-sm font-medium text-ink underline decoration-ink-soft decoration-1 underline-offset-4 hover:decoration-ink';

/** An inline link. External links open a new tab and say so. */
export function A({ href, children }: { href: string; children: React.ReactNode }) {
  if (href.startsWith('http')) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener" className={LINK}>
        {children}
        <ExternalLink aria-hidden className="ml-1 inline size-3 align-baseline" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={LINK}>
      {children}
    </Link>
  );
}

/** An email address as a mailto link. */
export function Mail({ address }: { address: string }) {
  return (
    <a href={`mailto:${address}`} className={cn(LINK, 'wrap-break-word')}>
      {address}
    </a>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className={cn(PROSE, 'mt-4')}>{children}</p>;
}

/** A short note under a table or list. */
export function Meta({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-[75ch] text-small text-ink">{children}</p>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className={cn(PROSE, 'mt-4 list-disc space-y-2 pl-5 marker:text-ink-soft')}>{children}</ul>
  );
}

/** A plain-words summary or a key commitment: a soft white card, never a colored stripe. */
export function Callout({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className={cn(CARD, 'mt-5 p-5 sm:p-6')}>
      {title ? <p className="text-label-strong text-ink">{title}</p> : null}
      <div className={cn(PROSE, title && 'mt-1')}>{children}</div>
    </div>
  );
}

/**
 * A numbered section with a stable anchor, clear of the fixed navbar when linked to. The heading links to
 * itself (a "#" shows on hover and keyboard focus) so a clause can be shared.
 */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="grid scroll-mt-[calc(var(--nav-clear)+16px)] gap-4 border-t border-ink/10 py-8 [counter-increment:legal-section] first:border-t-0 first:pt-0 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-0 lg:border-t-0 lg:py-10 lg:first:pt-0"
    >
      <div className="lg:pr-8">
        <h2 className="lg:sticky lg:top-[calc(var(--nav-clear)+16px)]">
          <span className="mb-1.5 block text-small-strong tabular-nums text-ink-soft before:content-[counter(legal-section,decimal-leading-zero)]" />
          <a
            href={`#${id}`}
            className="group/anchor rounded-sm font-display text-[1.875rem] leading-[1.12] text-ink"
          >
            {title}
            <span
              aria-hidden
              className="ml-2 font-sans text-base text-ink-soft opacity-0 transition-opacity duration-150 group-hover/anchor:opacity-100 group-focus-visible/anchor:opacity-100 motion-reduce:transition-none"
            >
              #
            </span>
          </a>
        </h2>
      </div>
      <div className="@container min-w-0 lg:border-l-2 lg:border-dotted lg:border-ink/40 lg:pl-10 [&>:first-child]:mt-0">
        {children}
      </div>
    </section>
  );
}

export interface TableRow {
  key: string;
  cells: readonly React.ReactNode[];
}

/**
 * A soft white table card with an ink-tinted pill header and hairline rows that lift on hover. When its
 * column is narrower than 672px (phones, and the right column of a section at 1024px) each row stacks: the
 * first cell as its title, then each other column as a label over its value, so nothing scrolls sideways.
 */
export function Table({
  label,
  head,
  rows,
}: {
  label: string;
  head: readonly string[];
  rows: readonly TableRow[];
}) {
  return (
    <div className={cn(CARD, 'mt-5 p-4')}>
      <table className="hidden w-full border-separate border-spacing-0 text-left @2xl:table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {head.map((cell) => (
              <th
                key={cell}
                scope="col"
                className="h-12 bg-ink/5 px-4 text-small-strong text-ink first:rounded-l-full last:rounded-r-full"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:first-child>td]:border-t-8 [&>tr:first-child>td]:border-t-transparent">
          {rows.map((row) => (
            <tr key={row.key} className="group/row">
              {row.cells.map((cell, index) => (
                <td
                  key={head[index]}
                  className={cn(
                    'border-b border-ink/10 px-4 py-3 align-top text-small transition-colors duration-150 ease-out-quart group-hover/row:bg-white/70',
                    index === 0 ? 'text-ink' : 'text-ink-soft',
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul aria-label={label} className="flex flex-col @2xl:hidden">
        {rows.map((row) => (
          <li key={row.key} className="border-b border-ink/10 px-4 py-3 last:border-b-0">
            <div className="text-small-strong text-ink">{row.cells[0]}</div>
            <dl className="mt-2 flex flex-col gap-2">
              {row.cells.slice(1).map((cell, index) => (
                <div key={head[index + 1]}>
                  <dt className="text-small text-ink-soft">{head[index + 1]}</dt>
                  <dd className="text-small text-ink-soft">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Who runs the product, at the foot of every legal page: the facts an OAuth review looks for. */
function OperatorCard() {
  const law = OPERATOR.law.charAt(0).toUpperCase() + OPERATOR.law.slice(1);
  const facts = [
    { term: 'Company', value: OPERATOR.entity },
    { term: 'Postal address', value: OPERATOR.address },
    { term: 'Governing law', value: law },
  ];
  return (
    <aside aria-labelledby="operator-title" className={cn(CARD, 'mt-6 p-5 sm:p-6')}>
      <h2 id="operator-title" className="font-display text-[1.625rem] leading-[1.15] text-ink">
        Who runs {OPERATOR.name}
      </h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.term}>
            <dt className="text-small-strong text-ink">{fact.term}</dt>
            <dd className="mt-1 text-body text-ink-soft">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function LegalShell({
  path,
  title,
  subtitle,
  updated,
  lead,
  children,
}: {
  path: LegalPath;
  title: string;
  /** One plain-language line under the title. */
  subtitle: string;
  updated: string;
  lead: string;
  children: React.ReactNode;
}) {
  const minutes = readingMinutes(lead, children);
  return (
    <main
      id="main"
      tabIndex={-1}
      className="relative isolate px-3 pb-12 outline-none sm:px-4 sm:pb-16 lg:px-6"
    >
      {/* The aurora band: three soft washes that fade to nothing before the box ends, so it has no edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem]"
        style={{
          backgroundImage: [
            'radial-gradient(60% 100% at 14% 0%, rgb(255 217 194 / 0.6), transparent 72%)',
            'radial-gradient(52% 90% at 86% 6%, rgb(191 221 247 / 0.5), transparent 72%)',
            'radial-gradient(46% 80% at 52% 0%, rgb(220 207 247 / 0.6), transparent 72%)',
          ].join(', '),
        }}
      />

      <header className="mx-auto flex max-w-[1440px] flex-col items-center pt-[calc(var(--nav-clear)+32px)] text-center md:pt-[calc(var(--nav-clear)+48px)]">
        <h1 className="font-display text-[2.75rem] leading-[1.03] tracking-[-0.015em] text-ink md:text-[4.5rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-[46ch] text-lead text-ink">{subtitle}</p>
        <p className="mt-3 text-small text-ink-soft">
          Last updated <time dateTime={updated}>{longDate(updated)}</time>
          <span aria-hidden> · </span>
          <span className="sr-only">, </span>
          {minutes} min read
        </p>

        <nav aria-label="Legal" className="mt-8 max-w-full">
          <ul className="glass-chip scrollbar-band flex w-max max-w-full snap-x snap-mandatory gap-1 p-1">
            {TABS.map((tab) => {
              const current = tab.href === path;
              return (
                <li key={tab.href} className="shrink-0 snap-start">
                  <Link
                    href={tab.href}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'press inline-flex h-10 items-center rounded-full px-3 text-ink -outline-offset-2 sm:px-5',
                      current
                        ? 'bg-aurora-peach text-label-strong'
                        : 'text-label hover:bg-white/70',
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <div className="glass-strong mx-auto mt-10 w-full max-w-[1440px] px-5 py-8 sm:px-10 sm:py-12">
        <p className={cn(PROSE, 'max-w-[62ch] text-[1.0625rem] md:text-lg')}>{lead}</p>

        <article className="mt-10 [counter-reset:legal-section] lg:mt-12 [&_code]:font-sans [&_code]:font-medium [&_code]:wrap-break-word">
          {children}
        </article>

        <OperatorCard />

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-ink/10 pt-6">
          <p className="text-body text-ink">
            Questions? <A href="/contact">Get in touch with us</A>
          </p>
          <a
            href="#main"
            className="press inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-small-strong text-ink hover:bg-white/70"
          >
            <ArrowUp aria-hidden className="size-4" />
            Back to top
          </a>
        </footer>
      </div>
    </main>
  );
}
