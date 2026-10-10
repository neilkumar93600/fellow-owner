import { cva } from 'class-variance-authority';

/**
 * DESIGN.md Buttons (Golden Hour Frost). Always a full pill with a Label. `primary` is the one coral
 * action per screen (white on coral 4.89:1), `secondary` a frosted glass pill, `ghost` a bare 40px round
 * icon button. Hover is a colour change only (never on a disabled or busy control), press scales to 0.98
 * through the `press` utility, and keyboard focus is the global 2px ink ring. `surface` names what the
 * button sits on: white (tables, panels, dialogs), glass (toolbars, the top bar) or card (tinted cards).
 *
 * No client directive, so server components can style a link with it:
 * `<Link href="/dashboard/promote" className={buttonVariants({ variant: 'secondary' })}>`.
 */
export const buttonVariants = cva(
  [
    'press relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-label whitespace-nowrap select-none',
    'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:not-aria-busy:cursor-not-allowed aria-disabled:not-aria-busy:opacity-50 aria-busy:cursor-progress',
    '[&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
  ],
  {
    variants: {
      variant: {
        /** The one primary action per screen: sunset coral, white words. */
        primary:
          'bg-coral text-white shadow-[0_10px_24px_-12px_rgb(200_67_42/0.6),inset_0_1px_0_rgb(255_255_255/0.25)] not-disabled:not-aria-disabled:hover:bg-coral-hover',
        /** Frosted glass pill, ink words. Every other action. */
        secondary:
          'glass-chip text-ink not-disabled:not-aria-disabled:hover:bg-white/90',
        /** 40px round icon button (aria-label required). Row actions add text-ink-soft. */
        ghost: 'text-ink',
        /** Ghost pill with a Signal Red icon and Brick Red words. */
        destructive:
          'text-danger-deep not-disabled:not-aria-disabled:hover:bg-white/70 [&_svg]:text-danger',
        /** The confirm button of a destructive dialog: a secondary pill in the destructive colours. */
        'destructive-secondary':
          'glass-chip text-danger-deep not-disabled:not-aria-disabled:hover:bg-white/90 [&_svg]:text-danger',
      },
      size: {
        lg: 'h-12',
        /** Toolbars and the destructive pill. */
        md: 'h-10 px-4',
        icon: 'size-10',
        /** Fan pages: 44px touch targets. */
        'icon-fan': 'size-11',
      },
      surface: { white: '', glass: '', card: '' },
    },
    compoundVariants: [
      { variant: 'primary', size: 'lg', className: 'px-6' },
      {
        variant: ['secondary', 'ghost', 'destructive', 'destructive-secondary'],
        size: 'lg',
        className: 'px-5',
      },
      // On plain white a glass pill needs a hairline to read as a control.
      {
        variant: ['secondary', 'destructive-secondary'],
        surface: 'white',
        className: 'border-line',
      },
      {
        variant: 'ghost',
        surface: 'white',
        className: 'not-disabled:not-aria-disabled:hover:bg-cream',
      },
      {
        variant: 'ghost',
        surface: ['glass', 'card'],
        className: 'not-disabled:not-aria-disabled:hover:bg-white/70',
      },
    ],
    defaultVariants: { variant: 'primary', size: 'lg', surface: 'white' },
  },
);
