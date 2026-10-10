'use client';

import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import type * as React from 'react';
import { cn } from './cn';
import { POPUP_SURFACE } from './popover';

/**
 * DESIGN.md Popover and menu: the row menu, the avatar menu. Arrow keys move between items, typing jumps
 * to one, Esc closes and focus returns to the trigger (Base UI). Style the trigger through `render`:
 * `<MenuTrigger render={<Button variant="ghost" className="text-ink-soft" aria-label="More actions for Arjun Rao" />}>…`.
 */
export const Menu = MenuPrimitive.Root;
export const MenuTrigger = MenuPrimitive.Trigger;

export type MenuContentProps = Omit<MenuPrimitive.Popup.Props, 'className'> & {
  className?: string;
  side?: MenuPrimitive.Positioner.Props['side'];
  align?: MenuPrimitive.Positioner.Props['align'];
  sideOffset?: number;
};

export function MenuContent({
  className,
  side = 'bottom',
  align = 'end',
  sideOffset = 8,
  ...props
}: MenuContentProps) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className="z-50"
      >
        <MenuPrimitive.Popup
          data-lenis-prevent=""
          className={cn(POPUP_SURFACE, className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

/** 40px rows in Body ink with an optional 16px icon; the highlighted row takes a 5% ink wash. */
const ITEM = cn(
  'flex h-10 cursor-pointer items-center gap-3 rounded-sm px-3 text-body text-ink select-none',
  'transition-colors duration-150 ease-out-quart data-highlighted:bg-ink/5',
  'data-disabled:cursor-not-allowed data-disabled:opacity-50',
  '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
);

export type MenuItemProps = Omit<MenuPrimitive.Item.Props, 'className'> & {
  className?: string;
  icon?: React.ReactNode;
  /** Archive, delete: a Signal Red icon and Brick Red words. */
  destructive?: boolean;
};

export function MenuItem({ className, icon, destructive, children, ...props }: MenuItemProps) {
  return (
    <MenuPrimitive.Item
      className={cn(ITEM, destructive && 'text-danger-deep [&_svg]:text-danger', className)}
      {...props}
    >
      {icon}
      {children}
    </MenuPrimitive.Item>
  );
}

export type MenuLinkItemProps = Omit<MenuPrimitive.LinkItem.Props, 'className'> & {
  className?: string;
  icon?: React.ReactNode;
};

/**
 * A link row. Pass `href`, or a Next link through `render={<Link href="/mira/me" />}`. It closes the menu
 * on click, since a client-side navigation can leave the trigger (and so the menu) mounted.
 */
export function MenuLinkItem({
  className,
  icon,
  closeOnClick = true,
  children,
  ...props
}: MenuLinkItemProps) {
  return (
    <MenuPrimitive.LinkItem
      closeOnClick={closeOnClick}
      className={cn(ITEM, className)}
      {...props}
    >
      {icon}
      {children}
    </MenuPrimitive.LinkItem>
  );
}

export function MenuSeparator({
  className,
  ...props
}: Omit<MenuPrimitive.Separator.Props, 'className'> & { className?: string }) {
  return <MenuPrimitive.Separator className={cn('mx-1 my-1 h-px bg-line', className)} {...props} />;
}
