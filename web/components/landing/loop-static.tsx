import Image from 'next/image';
import { cn } from '@/lib/utils';
import { loopFrameSrc, loopStages } from './loop-data';

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * The loop without motion: five key frames stacked with their stage copy. Shown for
 * prefers-reduced-motion (CSS) and without JavaScript (the noscript style in loop-section.tsx).
 * Plain markup, no entrance animation, so it reads complete either way.
 */
export function LoopStatic() {
  return (
    <div className="mx-auto max-w-[1360px] px-4 pt-20 pb-24 md:px-8 md:pt-28 md:pb-32 xl:px-10">
      <div className="max-w-[40rem]">
        <p className="eyebrow">The loop</p>
        <h2 className="mt-5 text-[2.25rem] leading-[1.02] font-medium tracking-[-0.035em] text-ink md:text-section">
          <span className="block">From followers</span>
          <span className="block">to fellow owners.</span>
        </h2>
      </div>

      <ol aria-label="The five stages" className="mt-12 flex flex-col gap-3 md:mt-16 md:gap-4">
        {loopStages.map((stage, index) => {
          const flip = index % 2 === 1;
          return (
            <li
              key={stage.id}
              className="grid items-center gap-5 rounded-shell bg-card-strong p-2 pb-6 md:grid-cols-12 md:gap-8 md:p-3 md:pb-3"
            >
              <div
                className={cn(
                  'relative aspect-video overflow-hidden rounded-[32px] bg-shell md:col-span-7',
                  flip && 'md:order-2',
                )}
              >
                <Image
                  src={loopFrameSrc('desktop', stage.keyFrame)}
                  alt={stage.alt}
                  fill
                  sizes="(min-width: 1360px) 760px, (min-width: 768px) 58vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div
                className={cn(
                  'px-4 md:col-span-5 md:px-6',
                  flip ? 'md:order-1 md:pl-10' : 'md:pr-10',
                )}
              >
                <p className="tabular text-small font-medium text-ink-muted">
                  {pad(index + 1)} / {pad(loopStages.length)}
                </p>
                <h3 className="mt-3 text-[2.25rem] leading-none font-medium tracking-[-0.035em] text-ink md:text-[3rem]">
                  {stage.name}
                </h3>
                <p className="mt-3 max-w-[34ch] text-lead text-ink-muted text-pretty">
                  {stage.line}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 px-2 text-small text-ink-muted">Demo: Mira Kapoor&rsquo;s audience.</p>
    </div>
  );
}
