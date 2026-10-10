// Pure time logic for the challenge card and its node check (challenge-time.check.mjs).

/**
 * A challenge takes entries only while it is open and not past due (the API answers 409 otherwise).
 * @param {{ status: string, dueAt: string }} challenge
 * @param {number} [now]
 */
export function acceptsEntries(challenge, now = Date.now()) {
  return challenge.status === 'open' && new Date(challenge.dueAt).getTime() > now;
}

/**
 * "Closes in 3 days", "Closes in 5 hours", "Closes in 20 minutes", "Closing now", or "Closed".
 * @param {string} dueAt ISO date
 * @param {number} [now]
 */
export function closesIn(dueAt, now = Date.now()) {
  const ms = new Date(dueAt).getTime() - now;
  if (!(ms > 0)) return 'Closed';
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  if (days >= 1) return `Closes in ${plural(days, 'day')}`;
  if (hours >= 1) return `Closes in ${plural(hours, 'hour')}`;
  if (minutes >= 1) return `Closes in ${plural(minutes, 'minute')}`;
  return 'Closing now';
}
