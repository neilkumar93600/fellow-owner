import {
  Archive,
  Bell,
  Copy,
  Ellipsis,
  Eye,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Star,
  UserRound,
  X,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type * as React from 'react';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { TINT_STYLES } from '@/components/shared/tint';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  CharCount,
  Field,
  FieldError,
  Helper,
  InputGroup,
  NativeSelect,
  TextArea,
  TextField,
} from '@/components/ui/field';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select } from '@/components/ui/select';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip } from '@/components/ui/tooltip';

// TEMPORARY dev-only gallery of components/ui; delete before release.
export const metadata: Metadata = { title: 'Primitives kit', robots: { index: false } };

const SORTS = [
  { value: 'fit', label: 'Fit' },
  { value: 'newest', label: 'Newest' },
] as const;
const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'replied', label: 'Replied' },
  { value: 'archived', label: 'Archived' },
] as const;
const RANGES = [
  { value: '4w', label: '4 weeks' },
  { value: '12w', label: '12 weeks' },
  { value: '26w', label: '26 weeks' },
] as const;
const COMMUNITIES = [
  'Budget Travel',
  'Solo Travelers',
  'Travel Photography',
  'Food Finds',
  'Road Trips & Van Life',
  'Slow Living',
];

const REPLY =
  'Love this, Priya. Send me the street-food map and I will share it with Food Finds on Friday.';
const NEAR = 'A street-food map for solo travelers: one tried-and-tasted stall per city.';
const OVER =
  'A street-food map for solo travelers: one tried-and-tasted stall per city, then a weekly recap for your community.';

function Section({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} id={id} className={className}>
      <h2 id={`${id}-title`} className="mb-4 text-h2 text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

function WhiteCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-white/70 bg-white/70 p-4 sm:p-6 ${className ?? ''}`}>
      {children}
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-small-strong text-ink-soft">{children}</p>;
}

export default function PrimitivesKitPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-10 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-display text-ink">Primitives kit</h1>
        <p className="mt-1 text-body text-ink-soft">
          Dev-only gallery of components/ui on the surfaces they live on.
        </p>
      </header>

      <Section id="shell" title="Glass and toolbar controls">
        <div className="glass flex min-h-[560px] flex-col gap-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-[2rem] leading-10 text-ink">Good morning, Mira</p>
              <p className="mt-1 text-body text-ink-soft">Here&rsquo;s what needs you today.</p>
            </div>
            <div className="glass flex h-16 items-center gap-1 rounded-full px-3">
              <Tooltip content="Search" describe={false} side="bottom">
                <Button variant="ghost" surface="glass" aria-label="Search">
                  <Search />
                </Button>
              </Tooltip>
              <Button variant="ghost" surface="glass" aria-label="Notifications, 3 new">
                <Bell />
              </Button>
              <Button variant="ghost" surface="glass" aria-label="Account" disabled>
                <UserRound />
              </Button>
            </div>
          </div>

          <div className="glass flex flex-wrap items-center justify-between gap-3 rounded-[28px] p-4 sm:rounded-full">
            <Button variant="secondary" surface="glass" size="md" trailingIcon={<Plus />}>
              Add community
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <span data-kit="open-select">
                <Select label="Sort" showLabel options={SORTS} defaultValue="fit" />
              </span>
              <Select label="Status" options={STATUSES} defaultValue="all" />
              <Select label="Chart range" options={RANGES} defaultValue="12w" disabled />
            </div>
          </div>

          <fieldset
            aria-label="Communities"
            className="glass scrollbar-band m-0 flex gap-2 rounded-3xl border-0 p-2"
          >
            {COMMUNITIES.map((name) => (
              <Button key={name} variant="secondary" surface="glass" size="md" className="shrink-0">
                {name}
              </Button>
            ))}
          </fieldset>

          <div className="mt-auto grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className={`rounded-3xl p-6 ${TINT_STYLES.peach.card}`}>
              <p className="text-small-strong text-ink-soft">Fans</p>
              <NumberTicker value={1200} className="text-stat text-ink-soft" />
              <p className="mt-4 text-trend text-success-ink">
                +18% <span className="text-body text-ink-soft">vs last week</span>
              </p>
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/60 p-6">
              <p className="mb-3 text-small-strong text-ink-soft">Loading, same shape</p>
              <div aria-busy="true" className="flex items-center gap-4">
                <Skeleton className="size-14 rounded-md" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-10 w-28 rounded-sm" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="mt-4 h-6 w-full" />
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/70 p-6">
              <p className="mb-3 text-small-strong text-ink-soft">AI chips</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-aurora-mint px-2.5 text-caption text-ink">
                  <Sparkles aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
                  AI pick
                </span>
                <span className="text-small text-ink-soft">Priya has made two city food maps.</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="sweep inline-flex h-6 items-center rounded-full border border-white/70 bg-white/60 px-2.5 text-caption text-ink">
                  AI reviewing
                </span>
                <span className="inline-flex items-center gap-2 text-small text-ink-soft">
                  <Spinner /> Spinner
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="buttons" title="Buttons">
        <WhiteCard className="flex flex-col gap-6">
          <div>
            <Caption>Primary: rest, loading with an icon, loading without one, disabled</Caption>
            <div className="flex flex-wrap items-center gap-4">
              <Button icon={<Megaphone />}>Publish</Button>
              <Button icon={<Megaphone />} loading>
                Publish
              </Button>
              <Button loading>Send idea</Button>
              <Button icon={<Send />} disabled>
                Send reply
              </Button>
            </div>
          </div>
          <div>
            <Caption>
              Secondary: 48px, disabled with its reason beside it, 40px toolbar pill, link
            </Caption>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="secondary" icon={<Copy />}>
                Copy link
              </Button>
              <span className="inline-flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  icon={<RefreshCw />}
                  disabled
                  aria-describedby="kit-regen-cap"
                >
                  Regenerate
                </Button>
                <span id="kit-regen-cap" className="text-small text-ink-soft">
                  5 of 5 used today
                </span>
              </span>
              <Button variant="secondary" size="md" trailingIcon={<Plus />}>
                New spotlight
              </Button>
              <Button variant="secondary" render={<Link href="#fields" />}>
                Jump to fields
              </Button>
            </div>
          </div>
          <div>
            <Caption>Ghost: row actions in ink-soft, fan size, busy; destructive</Caption>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                className="text-ink-soft"
                aria-label="Open idea from Priya Shah"
              >
                <Eye />
              </Button>
              <Button variant="ghost" className="text-ink-soft" aria-label="Edit Budget Travel">
                <Pencil />
              </Button>
              <Menu>
                <MenuTrigger
                  data-kit="open-menu"
                  render={
                    <Button
                      variant="ghost"
                      className="text-ink-soft"
                      aria-label="More actions for Priya Shah"
                    />
                  }
                >
                  <Ellipsis />
                </MenuTrigger>
                <MenuContent>
                  <MenuItem icon={<Eye />}>Open idea</MenuItem>
                  <MenuItem icon={<Star />}>Shortlist</MenuItem>
                  <MenuLinkItem icon={<UserRound />} render={<Link href="#fields" />}>
                    View Priya&rsquo;s profile
                  </MenuLinkItem>
                  <MenuItem icon={<Copy />} disabled>
                    Copy link
                  </MenuItem>
                  <MenuSeparator />
                  <MenuItem icon={<Archive />} destructive>
                    Archive idea
                  </MenuItem>
                </MenuContent>
              </Menu>
              <Button variant="ghost" size="icon-fan" aria-label="Close">
                <X />
              </Button>
              <Button variant="ghost" aria-label="Refreshing" loading>
                <RefreshCw />
              </Button>
              <Dialog>
                <DialogTrigger
                  data-kit="open-dialog"
                  render={<Button variant="destructive" icon={<Archive />} />}
                >
                  Archive community
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Archive Budget Travel?</DialogTitle>
                  <DialogDescription>
                    Fans keep their posts and you can restore Budget Travel from Settings at any
                    time.
                  </DialogDescription>
                  <DialogFooter>
                    <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
                    <DialogClose
                      render={<Button variant="destructive-secondary" icon={<Archive />} />}
                    >
                      Archive community
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </WhiteCard>
      </Section>

      <Section id="overlays" title="Overlays">
        <WhiteCard className="flex flex-wrap items-center gap-4">
          <Sheet>
            <SheetTrigger data-kit="open-sheet" render={<Button variant="secondary" />}>
              Open side panel
            </SheetTrigger>
            <SheetContent>
              <SheetHeader
                title="Street-food map for solo travelers"
                status={
                  <span className="inline-flex h-6 items-center rounded-full bg-warn-bg px-2.5 text-caption text-warn-ink">
                    New
                  </span>
                }
              />
              <SheetBody className="flex flex-col gap-4">
                <p className="text-small text-ink-soft">Collab idea from Priya Shah · Oct 2</p>
                <p className="max-w-[68ch] text-body text-ink">
                  I travel solo and eat at family-run stalls in every city. I would like to make a
                  street-food map with the Food Finds community: one tried-and-tasted stall per city
                  and a weekly recap.
                </p>
                <div className="rounded-lg bg-lavender px-4 py-3">
                  <p className="text-small-strong text-ink">Strong match</p>
                  <p className="mt-1 text-small text-ink-soft">
                    Matches your love of small family-run food spots: Priya has made two city food
                    maps and asks for no fee.
                  </p>
                </div>
                <Field
                  label="Reply to Priya"
                  helper="Priya sees your reply in My space."
                  count={{ value: REPLY.length, max: 2000 }}
                >
                  <TextArea defaultValue={REPLY} />
                </Field>
              </SheetBody>
              <SheetFooter>
                <Button variant="secondary" icon={<Star />}>
                  Shortlist
                </Button>
                <Button variant="destructive" icon={<Archive />}>
                  Archive
                </Button>
                <Button icon={<Send />} className="w-full">
                  Send reply
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <Popover>
            <PopoverTrigger data-kit="open-popover" render={<Button variant="secondary" />}>
              Share bio link
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <p className="px-3 pt-2 text-label-strong text-ink">fellowowners.app/mira</p>
              <p className="px-3 pt-1 pb-3 text-small text-ink-soft">
                Fans join a community from here.
              </p>
              <PopoverClose render={<Button variant="secondary" size="md" icon={<Copy />} />}>
                Copy link
              </PopoverClose>
            </PopoverContent>
          </Popover>

          <TextField
            data-kit="before-tooltip"
            aria-label="Focus here, then press Tab"
            placeholder="Focus here, then press Tab"
            className="w-64"
          />
          <Tooltip content="Matches your love of small family-run food spots.">
            <Button variant="secondary" size="md">
              Strong match
            </Button>
          </Tooltip>
          <Tooltip
            defaultOpen
            side="right"
            content="Ideas this week counts posts across all six communities."
          >
            <Button variant="ghost" aria-label="About Ideas this week">
              <Sparkles />
            </Button>
          </Tooltip>
        </WhiteCard>
      </Section>

      <Section id="fields" title="Fields">
        <WhiteCard className="grid gap-6 md:grid-cols-2">
          <Field label="Idea subject" helper="One line on what you want to make.">
            <TextField placeholder="A street-food map for solo travelers" />
          </Field>
          <Field label="Handle" error="Handle taken. Try mira.studio, mira.lane or mira_l.">
            <TextField defaultValue="mira" />
          </Field>
          <Field label="Instagram" optional helper="Shown as a chip on your bio link.">
            <InputGroup leading="@">
              <TextField defaultValue="miralane" />
            </InputGroup>
          </Field>
          <Field label="Email" disabled helper="Change it in Settings.">
            <TextField type="email" defaultValue="mira@fellowowners.app" />
          </Field>
          <div className="flex flex-col gap-6">
            <InputGroup leading={<Search />}>
              <TextField type="search" aria-label="Search fans" placeholder="Search fans" />
            </InputGroup>
            <Field label="Message type">
              <NativeSelect defaultValue="collab">
                <option value="collab">Collab</option>
                <option value="brand_deal">Brand deal</option>
                <option value="idea">Idea</option>
                <option value="press">Press</option>
                <option value="fan-note">Fan note</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="Your idea" count={{ value: NEAR.length, max: 76 }}>
            <TextArea defaultValue={NEAR} />
          </Field>
          <Field label="Instagram caption" count={{ value: OVER.length, max: 100 }}>
            <TextArea defaultValue={OVER} />
          </Field>
          <div>
            <p className="mb-1.5 text-small-strong text-ink">Parts on their own</p>
            <Helper>Helper text in Small ink-soft.</Helper>
            <CharCount value={42} max={280} />
            <FieldError>Add at least one link so Mira can see your work.</FieldError>
          </div>
        </WhiteCard>
      </Section>

      <Section id="type" title="Type roles">
        <WhiteCard className="flex flex-col gap-3">
          <p className="text-display text-ink">Display: Good morning, Mira</p>
          <p className="text-h1 text-ink">H1: Budget Travel</p>
          <p className="text-h2 text-ink">H2: Your AI briefing</p>
          <p className="text-stat text-ink-soft">1,200 1,111</p>
          <p className="text-count text-ink-soft">214 111</p>
          <p className="text-trend text-success-ink">+18% +11%</p>
          <p className="text-body text-ink">
            Body: fans gather by interest and the creator drops by.
          </p>
          <p className="text-label text-ink">Label: Publish</p>
          <p className="text-label-strong text-ink">Label Strong: Fellow Owners</p>
          <p className="text-small text-ink-soft">Small: 12 would use this · 4 would help build</p>
          <p className="text-small-strong text-ink">Small Strong: Fans 1,200</p>
          <p className="text-caption text-ink">Caption: AI pick 88</p>
        </WhiteCard>
      </Section>
    </main>
  );
}
