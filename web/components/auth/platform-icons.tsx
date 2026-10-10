import type { SocialPlatform } from '@fellow-owners/shared';
import { useId } from 'react';
import { cx } from './auth-classes';

/**
 * The social platforms' own marks, as the user supplied them. Decorative: the platform's name always
 * travels beside the icon (visibly in the list, visually hidden in the picker's trigger). X and
 * TikTok's dark parts use currentColor in ink, since DESIGN.md never sets pure black.
 */
export function PlatformIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const Mark = MARKS[platform];
  return <Mark className={cx('size-5 shrink-0 text-ink', className)} />;
}

type MarkProps = { className: string };

/** Two gradients, with ids unique per instance: the icon shows in the trigger and the list at once. */
function Instagram({ className }: MarkProps) {
  const id = useId();
  const warm = `${id}-warm`;
  const cool = `${id}-cool`;
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 256 256" className={className}>
      <g fill="none">
        <rect width="256" height="256" fill={`url(#${warm})`} rx="60" />
        <rect width="256" height="256" fill={`url(#${cool})`} rx="60" />
        <path
          fill="#fff"
          d="M128.009 28c-27.158 0-30.567.119-41.233.604c-10.646.488-17.913 2.173-24.271 4.646c-6.578 2.554-12.157 5.971-17.715 11.531c-5.563 5.559-8.98 11.138-11.542 17.713c-2.48 6.36-4.167 13.63-4.646 24.271c-.477 10.667-.602 14.077-.602 41.236s.12 30.557.604 41.223c.49 10.646 2.175 17.913 4.646 24.271c2.556 6.578 5.973 12.157 11.533 17.715c5.557 5.563 11.136 8.988 17.709 11.542c6.363 2.473 13.631 4.158 24.275 4.646c10.667.485 14.073.604 41.23.604c27.161 0 30.559-.119 41.225-.604c10.646-.488 17.921-2.173 24.284-4.646c6.575-2.554 12.146-5.979 17.702-11.542c5.563-5.558 8.979-11.137 11.542-17.712c2.458-6.361 4.146-13.63 4.646-24.272c.479-10.666.604-14.066.604-41.225s-.125-30.567-.604-41.234c-.5-10.646-2.188-17.912-4.646-24.27c-2.563-6.578-5.979-12.157-11.542-17.716c-5.562-5.562-11.125-8.979-17.708-11.53c-6.375-2.474-13.646-4.16-24.292-4.647c-10.667-.485-14.063-.604-41.23-.604zm-8.971 18.021c2.663-.004 5.634 0 8.971 0c26.701 0 29.865.096 40.409.575c9.75.446 15.042 2.075 18.567 3.444c4.667 1.812 7.994 3.979 11.492 7.48c3.5 3.5 5.666 6.833 7.483 11.5c1.369 3.52 3 8.812 3.444 18.562c.479 10.542.583 13.708.583 40.396s-.104 29.855-.583 40.396c-.446 9.75-2.075 15.042-3.444 18.563c-1.812 4.667-3.983 7.99-7.483 11.488c-3.5 3.5-6.823 5.666-11.492 7.479c-3.521 1.375-8.817 3-18.567 3.446c-10.542.479-13.708.583-40.409.583c-26.702 0-29.867-.104-40.408-.583c-9.75-.45-15.042-2.079-18.57-3.448c-4.666-1.813-8-3.979-11.5-7.479s-5.666-6.825-7.483-11.494c-1.369-3.521-3-8.813-3.444-18.563c-.479-10.542-.575-13.708-.575-40.413s.096-29.854.575-40.396c.446-9.75 2.075-15.042 3.444-18.567c1.813-4.667 3.983-8 7.484-11.5s6.833-5.667 11.5-7.483c3.525-1.375 8.819-3 18.569-3.448c9.225-.417 12.8-.542 31.437-.563zm62.351 16.604c-6.625 0-12 5.37-12 11.996c0 6.625 5.375 12 12 12s12-5.375 12-12s-5.375-12-12-12zm-53.38 14.021c-28.36 0-51.354 22.994-51.354 51.355s22.994 51.344 51.354 51.344c28.361 0 51.347-22.983 51.347-51.344c0-28.36-22.988-51.355-51.349-51.355zm0 18.021c18.409 0 33.334 14.923 33.334 33.334c0 18.409-14.925 33.334-33.334 33.334s-33.333-14.925-33.333-33.334c0-18.411 14.923-33.334 33.333-33.334"
        />
        <defs>
          <radialGradient
            id={warm}
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(0 -253.715 235.975 0 68 275.717)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fd5" />
            <stop offset=".1" stopColor="#fd5" />
            <stop offset=".5" stopColor="#ff543e" />
            <stop offset="1" stopColor="#c837ab" />
          </radialGradient>
          <radialGradient
            id={cool}
            cx="0"
            cy="0"
            r="1"
            gradientTransform="rotate(78.68 -32.69 -16.937)scale(113.412 467.488)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3771c8" />
            <stop offset=".128" stopColor="#3771c8" />
            <stop offset="1" stopColor="#60f" stopOpacity="0" />
          </radialGradient>
        </defs>
      </g>
    </svg>
  );
}

function TikTok({ className }: MarkProps) {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 512 512" className={className}>
      <path
        fill="#26f4ee"
        fillRule="evenodd"
        d="M345.2 0c8.2 70.4 50.4 120.1 118.7 124.5v66.8h-.4v-56.7C395.2 130.2 356 88.2 347.7 17.8h-72.3V314c10.4 133.3-93.4 137.3-133.2 86.7c46.6 29.1 122.3 10.2 113.3-104.5V0zM151 491c-40.8-8.4-78-32.8-99.8-68.5c-53-86.7-5.2-228 148.5-242.5v83.5h-.3v-62.6C56.9 223.6 42.6 376.6 82.1 440.3c15.2 24.5 40.2 41.8 68.9 50.7"
      />
      <path
        fill="#fb2c53"
        fillRule="evenodd"
        d="M365.9 17.8c5.4 46 24 85.1 55.2 107.9c-42.3-16.3-67-53.7-73.4-107.9zm97.5 126.7c5.8 1.2 11.9 2.1 18.2 2.5v79.2C442 230 407.4 217 367 192.7l6.2 135.6c0 43.7.2 63.7-23.3 103.9c-52.6 90.2-147.3 97.3-211.4 54.4c83.8 34.6 210.6-7.4 210.3-158.3v-148c40.4 24.3 75 37.3 114.6 33.4zm-264 57.2q12.45-2.55 26.1-3.9v83.5c-33.3 5.5-54.4 15.7-64.3 34.6c-31.1 59.5 9 106.7 53.8 113.8c-52.1 8.7-113.2-44.2-76.8-113.8c9.9-18.9 27.9-29.1 61.2-34.6zm99-183.9h2.8z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M347.7 17.8c8.2 70.4 47.5 112.4 115.7 116.8v79.1c-39.6 3.9-74.2-9.1-114.6-33.4v148c.3 193.1-207.4 207.8-266.8 112c-39.5-63.7-25.2-216.7 117.3-239.4v80.4c-33.3 5.5-51.3 15.7-61.2 34.6c-61.1 116.8 152 186.3 137.2-1.9V17.8z"
      />
    </svg>
  );
}

/** YouTube's mark is wider than tall (256 by 180): a square viewBox centers it in the icon box. */
function YouTube({ className }: MarkProps) {
  return (
    <svg aria-hidden focusable="false" viewBox="0 -38 256 256" className={className}>
      <path
        fill="red"
        d="M250.346 28.075A32.18 32.18 0 0 0 227.69 5.418C207.824 0 127.87 0 127.87 0S47.912.164 28.046 5.582A32.18 32.18 0 0 0 5.39 28.24c-6.009 35.298-8.34 89.084.165 122.97a32.18 32.18 0 0 0 22.656 22.657c19.866 5.418 99.822 5.418 99.822 5.418s79.955 0 99.82-5.418a32.18 32.18 0 0 0 22.657-22.657c6.338-35.348 8.291-89.1-.164-123.134"
      />
      <path fill="#fff" d="m102.421 128.06l66.328-38.418l-66.328-38.418z" />
    </svg>
  );
}

function X({ className }: MarkProps) {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 128 128" className={className}>
      <path
        fill="currentColor"
        d="M75.916 54.2L122.542 0h-11.05L71.008 47.06L38.672 0H1.376l48.898 71.164L1.376 128h11.05L55.18 78.303L89.328 128h37.296L75.913 54.2ZM60.782 71.79l-4.955-7.086l-39.42-56.386h16.972L65.19 53.824l4.954 7.086l41.353 59.15h-16.97L60.782 71.793Z"
      />
    </svg>
  );
}

function LinkedIn({ className }: MarkProps) {
  return (
    <svg aria-hidden focusable="false" viewBox="0 0 128 128" className={className}>
      <path
        fill="#0076b2"
        d="M116 3H12a8.91 8.91 0 0 0-9 8.8v104.42a8.91 8.91 0 0 0 9 8.78h104a8.93 8.93 0 0 0 9-8.81V11.77A8.93 8.93 0 0 0 116 3"
      />
      <path
        fill="#fff"
        d="M21.06 48.73h18.11V107H21.06zm9.06-29a10.5 10.5 0 1 1-10.5 10.49a10.5 10.5 0 0 1 10.5-10.49m20.41 29h17.36v8h.24c2.42-4.58 8.32-9.41 17.13-9.41C103.6 47.28 107 59.35 107 75v32H88.89V78.65c0-6.75-.12-15.44-9.41-15.44s-10.87 7.36-10.87 15V107H50.53z"
      />
    </svg>
  );
}

const MARKS: Record<SocialPlatform, (props: MarkProps) => React.JSX.Element> = {
  instagram: Instagram,
  tiktok: TikTok,
  youtube: YouTube,
  x: X,
  linkedin: LinkedIn,
};
