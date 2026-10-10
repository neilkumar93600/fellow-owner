"use client"

import { cva, type VariantProps } from "class-variance-authority"
import Link from "next/link"
import * as React from "react"
import { cn } from "@/lib/utils"

export const rainbowButtonVariants = cva(
  cn(
    "group relative isolate inline-flex shrink-0 press items-center justify-center gap-2",
    "cursor-pointer rounded-full font-medium whitespace-nowrap select-none",
    // Focus is the global 2px ink outline (DESIGN.md Focus). The animation waits for data-inview.
    "[&:not([data-inview])]:[animation-play-state:paused] [&:not([data-inview])]:before:[animation-play-state:paused]",
    "disabled:pointer-events-none disabled:opacity-50",
    "animate-rainbow transition-all duration-300 motion-reduce:animate-none",
    "[&_svg]:shrink-0 [&_svg]:stroke-[1.5]"
  ),
  {
    variants: {
      variant: {
        /** Dark luminous pill with rotating rainbow perimeter border and soft ambient rainbow glow. */
        default: cn(
          "border-0 bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_50%,rgba(18,18,19,0.6)_80%,rgba(18,18,19,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]",
          "bg-[length:200%] text-white",
          "[background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.125rem)_solid_transparent]",
          "before:pointer-events-none before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/4 before:w-3/4 before:-translate-x-1/2 before:rounded-full",
          "before:animate-rainbow motion-reduce:before:hidden motion-reduce:before:animate-none",
          "before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:opacity-75 before:blur-[12px] before:transition-opacity group-hover:before:opacity-100",
          "dark:bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(255,255,255,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] dark:text-ink"
        ),
        /** Light frosted pill with rainbow perimeter border, perfect for subtle accents on glass surfaces. */
        outline: cn(
          "border-0 bg-[linear-gradient(#ffffff,#ffffff),linear-gradient(#ffffff_50%,rgba(255,255,255,0.7)_80%,rgba(255,255,255,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))]",
          "bg-[length:200%] text-ink shadow-sm",
          "[background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.125rem)_solid_transparent]",
          "before:pointer-events-none before:absolute before:bottom-[-20%] before:left-1/2 before:z-0 before:h-1/4 before:w-3/4 before:-translate-x-1/2 before:rounded-full",
          "before:animate-rainbow motion-reduce:before:hidden motion-reduce:before:animate-none",
          "before:bg-[linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] before:bg-[length:200%] before:opacity-60 before:blur-[12px] before:transition-opacity group-hover:before:opacity-90",
          "dark:bg-[linear-gradient(#0f172a,#0f172a),linear-gradient(#0f172a_50%,rgba(15,23,42,0.6)_80%,rgba(0,0,0,0)),linear-gradient(90deg,var(--color-1),var(--color-5),var(--color-3),var(--color-4),var(--color-2))] dark:text-white"
        ),
      },
      size: {
        /** 40px pill: matches navbar actions and standard action heights. */
        default: "h-10 px-5 text-sm",
        /** 32px compact pill for dense toolbars or chips. */
        sm: "h-8 px-3.5 text-xs",
        /** 40px standard action pill. */
        md: "h-10 px-5 text-sm",
        /** 48px hero & landing CTA pill: prominent and luxurious. */
        lg: "h-12 px-7 text-base font-semibold",
        /** 40px circular button. */
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface RainbowOptions {
  /** Animation duration for one full cycle. Defaults to '2s'. */
  speed?: string
}

export interface RainbowButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof rainbowButtonVariants>,
    RainbowOptions {}

export interface RainbowLinkProps
  extends
    Omit<React.ComponentPropsWithRef<typeof Link>, "href">,
    VariantProps<typeof rainbowButtonVariants>,
    RainbowOptions {
  href: string
}

/**
 * Sets data-inview the first time the element is on screen. The border and glow then run three passes
 * (--animate-rainbow in globals.css) and rest; before that, and without JavaScript, they sit still.
 */
export function useRainbowInView<T extends HTMLElement>() {
  return React.useCallback((node: T | null) => {
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.inview = ""
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        node.dataset.inview = ""
        io.disconnect()
      }
    })
    io.observe(node)
    return () => io.disconnect()
  }, [])
}

function resolveRainbowStyle(
  speed?: string,
  style?: React.CSSProperties
): React.CSSProperties {
  return {
    "--speed": speed ?? "2s",
    ...style,
  } as React.CSSProperties
}

/**
 * Magic UI Rainbow Button (magicui.design/docs/components/rainbow-button), installed by copy and adapted
 * for Fellow Owner's Frosted Glassmorphism design system:
 * - Animated rainbow border created with multiple background clips on transparent border;
 * - Ambient blurred rainbow aura glowing beneath the button (`::before`);
 * - Full pill radius (`rounded-full`) matching Fellow Owner's UI design specifications;
 * - Respects prefers-reduced-motion (stops animation and hides aura) to meet WCAG 2.2.2; otherwise it runs
 *   3 passes once in view, then rests (never an endless loop);
 * - Focus is the global 2px ink outline, not a purple ring;
 * - Settled Press Rule: tactile 0.98 scale feedback on press;
 * - Exports both `RainbowButton` (<button>) and `RainbowLink` (<Link>).
 */
export function RainbowButton({
  className,
  variant,
  size,
  speed,
  style,
  type = "button",
  children,
  ...props
}: RainbowButtonProps) {
  const ref = useRainbowInView<HTMLButtonElement>()
  return (
    <button
      ref={ref}
      type={type}
      className={cn(rainbowButtonVariants({ variant, size }), className)}
      style={resolveRainbowStyle(speed, style)}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  )
}

export function RainbowLink({
  href,
  className,
  variant,
  size,
  speed,
  style,
  children,
  ...props
}: RainbowLinkProps) {
  const ref = useRainbowInView<HTMLAnchorElement>()
  return (
    <Link
      ref={ref}
      href={href}
      className={cn(rainbowButtonVariants({ variant, size }), className)}
      style={resolveRainbowStyle(speed, style)}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </Link>
  )
}
