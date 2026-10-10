import { Instrument_Serif, Inter } from 'next/font/google';

/** Inter variable with the optical-size axis: all UI and body text. */
export const inter = Inter({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-inter',
  display: 'swap',
});

/** Instrument Serif: display headlines (28px and up) and the occasional italic accent word (`font-display`). */
export const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  display: 'swap',
});
