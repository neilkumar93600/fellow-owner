// Sidebar cookie check. Usage: node scripts/check-sidebar-cookie.mjs [origin=http://localhost:3006]
// Signs in as the demo creator, then asks /dashboard for its HTML with each fo_sidebar value and checks
// the server-rendered shell: "expanded" -> data-sidebar="expanded", "collapsed", junk and no cookie ->
// data-sidebar="collapsed" (so there is no flash and no hydration mismatch). Exits 1 on any miss.
const origin = process.argv[2] ?? 'http://localhost:3006';

const res = await fetch(`${origin}/api/demo/session`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ as: 'creator' }),
});
if (!res.ok) throw new Error(`demo session failed: ${res.status}`);
const session = res.headers
  .getSetCookie()
  .map((c) => c.split(';')[0])
  .join('; ');

const cases = [
  ['expanded', 'expanded'],
  ['collapsed', 'collapsed'],
  ['Expanded', 'collapsed'],
  ['<script>', 'collapsed'],
  ['', 'collapsed'],
  [undefined, 'collapsed'],
];
let failed = 0;
for (const [value, want] of cases) {
  const cookie = value === undefined ? session : `${session}; fo_sidebar=${value}`;
  const html = await (await fetch(`${origin}/dashboard`, { headers: { cookie } })).text();
  const got = /data-sidebar="(\w+)"/.exec(html)?.[1];
  const ok = got === want;
  if (!ok) failed++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} fo_sidebar=${JSON.stringify(value)} -> ${got} (want ${want})`,
  );
}
process.exit(failed ? 1 : 0);
