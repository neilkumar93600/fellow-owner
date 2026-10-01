import { Inter } from 'next/font/google';

/** Inter variable with the optical-size axis (04 §4: Inter via next/font). */
export const inter = Inter({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-inter',
  display: 'swap',
});
