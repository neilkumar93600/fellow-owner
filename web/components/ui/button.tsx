'use client';

import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { useRender } from '@base-ui/react/use-render';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { buttonVariants } from './button-variants';
import { cn } from './cn';
import { Spinner } from './spinner';

export { buttonVariants };

export type ButtonProps = Omit<
  ButtonPrimitive.Props,
  'className' | 'style' | 'render' | 'nativeButton' | 'focusableWhenDisabled'
> &
  VariantProps<typeof buttonVariants> & {
    className?: string;
    style?: React.CSSProperties;
    /** Leading 20px icon. While loading a 16px spinner takes its place. */
    icon?: React.ReactNode;
    /** Trailing 16px icon, such as the "+" of a toolbar pill that creates something. */
    trailingIcon?: React.ReactNode;
    /** Busy: spinner in the icon slot, label and width kept, aria-busy, presses ignored, focus kept. */
    loading?: boolean;
    /** Render another element, such as a Next `<Link href>`, which keeps its link semantics. */
    render?: React.ReactElement;
  };

function IconSlot({ children, busy }: { children: React.ReactNode; busy: boolean }) {
  return (
    <span className={cn('grid size-5 shrink-0 place-items-center', !busy && '[&>svg]:size-5')}>
      {children}
    </span>
  );
}

/**
 * Sizes default per variant: ghost is the 40px icon button, destructive the 40px pill, the rest 48px.
 * A button that can load should carry an `icon`; without one the spinner sits over the label (which
 * stays the accessible name) so the width still holds.
 *
 * A client component on purpose: a server component can then hand `<Button />` to a Base UI `render`
 * prop (DialogTrigger, MenuTrigger, DialogClose) and the trigger's children still reach it. For classes
 * alone in a server component, import buttonVariants from ./button-variants.
 */
export function Button({
  variant = 'primary',
  size,
  surface,
  className,
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  render,
  children,
  ...props
}: ButtonProps) {
  const resolvedSize =
    size ?? (variant === 'ghost' ? 'icon' : variant === 'destructive' ? 'md' : 'lg');
  const classes = cn(buttonVariants({ variant, size: resolvedSize, surface }), className);
  const overlay = loading && !icon;

  const content =
    resolvedSize === 'icon' || resolvedSize === 'icon-fan' ? (
      <IconSlot busy={loading}>{loading ? <Spinner /> : children}</IconSlot>
    ) : (
      <>
        {icon ? <IconSlot busy={loading}>{loading ? <Spinner /> : icon}</IconSlot> : null}
        {overlay ? <span className="opacity-0">{children}</span> : children}
        {trailingIcon ? (
          <span
            className={cn('grid shrink-0 place-items-center [&>svg]:size-4', overlay && 'opacity-0')}
          >
            {trailingIcon}
          </span>
        ) : null}
        {overlay ? (
          <span className="absolute inset-0 grid place-items-center">
            <Spinner />
          </span>
        ) : null}
      </>
    );

  // A link styled as a button keeps its link semantics (no role="button"); a disabled one leaves the
  // tab order and ignores the pointer.
  const link = useRender({
    render,
    enabled: Boolean(render),
    props: {
      ...props,
      className: cn(classes, disabled && 'pointer-events-none'),
      'aria-disabled': disabled || undefined,
      tabIndex: disabled ? -1 : props.tabIndex,
      children: content,
    },
  });
  if (render) return link;

  return (
    <ButtonPrimitive
      type="button"
      {...props}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </ButtonPrimitive>
  );
}
