import Image from 'next/image';
import { TwinBrief } from '@/components/landing/twin-brief';
import { AuthPanelLine } from './auth-switch';

/**
 * The right half of the auth frame, from 1024px (hidden below, so phones never load it): the product
 * art inset 8px with radius 24, as tall as the frame. Words never sit on the art: a compact "Your AI
 * twin" card floats top left, and a frosted caption card sits at the bottom with the headline and this
 * screen's line. Static, no entrance, no API call.
 */
export function AuthPanel() {
  return (
    <section
      aria-label="About Fellow Owners"
      className="relative hidden min-w-0 overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#bfe0f2_0%,#f6e3cf_55%,#f4efe4_100%)] lg:block"
    >
      <Image
        src="/atlas/poster-mobile.webp"
        alt=""
        fill
        sizes="50vw"
        className="object-cover"
        aria-hidden
      />
      <div aria-hidden inert className="absolute top-6 left-6 w-[20rem] max-w-[calc(100%-3rem)]">
        <TwinBrief compact />
      </div>
      <div className="absolute inset-x-4 bottom-4 mx-auto max-w-[32rem] glass-strong !rounded-[1.25rem] p-5 xl:inset-x-6 xl:bottom-6 xl:p-6">
        <p className="font-display text-h1 text-balance text-ink xl:text-display">
          Turn followers into fellow owners.
        </p>
        <AuthPanelLine className="mt-2 text-body text-pretty text-ink-soft" />
      </div>
    </section>
  );
}
