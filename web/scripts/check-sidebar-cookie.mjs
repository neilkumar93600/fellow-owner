// Sidebar cookie check. Usage: FO_SESSION_COOKIE="<name>=<value>" node scripts/check-sidebar-cookie.mjs [origin=http://localhost:3006]
// FO_SESSION_COOKIE is the session cookie of a signed-in creator (copy it from the browser). Asks /dashboard for
// its HTML with each fo_sidebar value and checks the server-rendered shell: "expanded" -> data-sidebar="expanded",
// "collapsed", junk and no cookie -> data-sidebar="collapsed" (so there is no flash and no hydration mismatch).
// Exits 1 on any miss.
const origin = process.argv[2] ?? 'http://localhost:3006';
const session = process.env.FO_SESSION_COOKIE;
if (!session) throw new Error('Set FO_SESSION_COOKIE to a signed-in creator session cookie.');

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
