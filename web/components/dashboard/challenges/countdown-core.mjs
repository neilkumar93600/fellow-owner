// Pure countdown words for a challenge's due date, so countdown.check.mjs can run them with Node.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "5 days left", "3 hours left", "12 minutes left", "Due now". `urgent` is true under a day, so the
 * pill can warn. `now` is the page's clock, so server and client render the same words.
 * @param {string} dueAt ISO date
 * @param {number} now ms since epoch
 * @returns {{ text: string, urgent: boolean, past: boolean }}
 */
export function countdown(dueAt, now) {
  const left = new Date(dueAt).getTime() - now;
  if (Number.isNaN(left)) return { text: '', urgent: false, past: false };
  if (left <= 0) return { text: 'Past due', urgent: true, past: true };
  if (left >= DAY) {
    const days = Math.floor(left / DAY);
    return { text: `${days} ${days === 1 ? 'day' : 'days'} left`, urgent: false, past: false };
  }
  if (left >= HOUR) {
    const hours = Math.floor(left / HOUR);
    return { text: `${hours} ${hours === 1 ? 'hour' : 'hours'} left`, urgent: true, past: false };
  }
  const minutes = Math.max(1, Math.floor(left / MINUTE));
  return {
    text: `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`,
    urgent: true,
    past: false,
  };
}
