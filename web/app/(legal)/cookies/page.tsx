import type { Metadata } from 'next';
import {
  A,
  Callout,
  LegalShell,
  Mail,
  Meta,
  P,
  Section,
  Table,
  UL,
} from '@/components/legal/legal-ui';
import { CONTACT, COOKIES, LEGAL_UPDATED, STORAGE } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Cookie policy',
  description:
    'The four first-party cookies Fellow Owners needs to sign you in, the browser storage that keeps your drafts, and nothing else. No analytics, no advertising, no third-party cookies.',
  alternates: { canonical: '/cookies' },
};

export default function Page() {
  return (
    <LegalShell
      path="/cookies"
      title="Cookie policy"
      subtitle="Everything stored on your device, and why."
      updated={LEGAL_UPDATED}
      lead="Four first-party cookies keep you signed in, and nothing else: no analytics, no advertising pixels, no third-party cookies. Below is everything stored on your device, and why."
    >
      <Section id="short-version" title="The short version">
        <P>
          A cookie is a small piece of text a website asks your browser to keep and send back with
          later requests, so the server knows you are signed in.
        </P>
        <Callout title="First-party and strictly necessary">
          Every cookie Fellow Owners sets is first-party (it comes from our domain and is never sent
          anywhere else) and strictly necessary to keep you signed in. We do not follow what you do
          on other websites.
        </Callout>
      </Section>

      <Section id="cookies" title="The cookies we set">
        <P>
          All four cookies are <code>httpOnly</code> (scripts on the page cannot read them),{' '}
          <code>secure</code> (sent over HTTPS only) and <code>SameSite=Lax</code> (protected
          against cross-site request forgery). Two are only created if you continue with Google,
          Apple or Facebook.
        </P>

        <Table
          label="Cookies Fellow Owners sets"
          head={['Cookie', 'Category', 'Purpose', 'Lifespan']}
          rows={COOKIES.map((cookie) => ({
            key: cookie.name,
            cells: [
              <code key="name">{cookie.name}</code>,
              'Strictly necessary',
              cookie.purpose,
              cookie.life,
            ],
          }))}
        />

        <Meta>
          In production the names carry the <code>__Secure-</code> prefix, as browsers expect for
          secure cookies.
        </Meta>

        <P>
          <strong>To browse without cookies:</strong> you do not need to sign in to read a
          creator&rsquo;s bio link or a public showcase page. Public pages set no cookies.
        </P>
      </Section>

      <Section id="storage" title="Browser storage, which is not a cookie">
        <P>
          Browsers also offer local storage (localStorage and sessionStorage). These entries never
          travel over the network and never reach our servers. They exist only so a closed tab or a
          dropped connection does not cost you your work.
        </P>

        <Table
          label="Browser storage keys"
          head={['Key', 'Where', 'Purpose', 'Lifespan']}
          rows={STORAGE.map((row) => ({
            key: row.key,
            cells: [<code key="key">{row.key}</code>, row.where, row.purpose, row.life],
          }))}
        />

        <Meta>
          Keys in <code>sessionStorage</code> are cleared when you close the tab. Keys in{' '}
          <code>localStorage</code> stay until you finish setup or clear site data in your browser.
        </Meta>
      </Section>

      <Section id="no-consent" title="Why there is no consent banner">
        <P>
          Under the EU ePrivacy Directive (Article 5(3)), a website must ask before it sets optional
          cookies: analytics, retargeting pixels and advertising beacons. Cookies that are strictly
          necessary for a service you asked for are exempt.
        </P>
        <Callout title="A notice, not a consent wall">
          An Accept and Reject banner over cookies that need no consent teaches people to click
          without reading. Because we set only strictly necessary cookies, we show a short notice
          with the full list instead.
        </Callout>
        <P>
          If we ever add a feature that needs an optional cookie, we will ask first: Reject will be
          as easy as Accept, nothing will be set before you choose, and you will be able to change
          your mind at any time.
        </P>
      </Section>

      <Section id="none-of-these" title="What we do not use">
        <P>None of the following is in the product:</P>
        <UL>
          <li>
            Google Analytics, Adobe Analytics, Mixpanel, Amplitude or any other analytics SDK.
          </li>
          <li>
            The Meta (Facebook) Pixel, the TikTok Pixel, Google Ads tags or X conversion tags.
          </li>
          <li>Third-party advertising cookies or cross-site tracking scripts.</li>
          <li>
            Browser fingerprinting, session replay recorders (such as Hotjar or FullStory) or
            heatmaps.
          </li>
          <li>Social media widgets that place third-party cookies in your browser.</li>
        </UL>
      </Section>

      <Section id="manage" title="How to clear or block cookies">
        <P>Your browser settings control every cookie:</P>
        <UL>
          <li>
            <strong>Clear cookies:</strong> delete the cookies for this site in your browser
            settings. That signs you out and removes the storage keys above.
          </li>
          <li>
            <strong>Block cookies:</strong> public pages keep working, but you cannot sign in,
            because a session needs the session cookie.
          </li>
          <li>
            <strong>Private browsing:</strong> a private window clears its cookies and storage when
            you close it.
          </li>
        </UL>
        <P>
          Browser guides: <A href="https://support.google.com/chrome/answer/95647">Google Chrome</A>
          ,{' '}
          <A href="https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox">
            Mozilla Firefox
          </A>
          ,{' '}
          <A href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac">
            Apple Safari
          </A>
          , <A href="https://support.microsoft.com/microsoft-edge">Microsoft Edge</A>.
        </P>
      </Section>

      <Section id="changes" title="Changes to this policy">
        <P>
          When this policy changes, the date at the top changes with it. We have no plans to add
          advertising or analytics trackers.
        </P>
      </Section>

      <Section id="contact" title="Contact">
        <P>
          Questions about cookies or browser storage go to <Mail address={CONTACT.privacy} />.
        </P>
      </Section>
    </LegalShell>
  );
}
