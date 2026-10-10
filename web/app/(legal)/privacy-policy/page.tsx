import type { Metadata } from 'next';
import { DataRequest } from '@/components/legal/data-request';
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
import {
  AI_MODELS,
  CONTACT,
  COOKIES,
  LEGAL_UPDATED,
  MIN_AGE,
  OPERATOR,
  PROCESSORS,
  RESPONSE_DAYS,
  RETENTION,
} from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What Fellow Owners collects, what it never collects, who processes it, how long it is kept, and how to get it deleted.',
  alternates: { canonical: '/privacy-policy' },
};

export default function Page() {
  return (
    <LegalShell
      path="/privacy-policy"
      title="Privacy policy"
      subtitle="What we collect, why, and how you stay in control."
      updated={LEGAL_UPDATED}
      lead="We collect only what it takes to run your space and sign you in. We do not track you across the web, we do not sell personal data, and your posts and ideas do not train AI models."
    >
      <Section id="who-we-are" title="Who we are">
        <P>
          {OPERATOR.name} is owned and operated by {OPERATOR.entity}, a corporation organized under
          the laws of {OPERATOR.law}, with its principal place of business at {OPERATOR.address}.
        </P>
        <P>
          Under the General Data Protection Regulation (GDPR) and global privacy statutes, we serve
          as the Data Controller for all personal data processed within the platform.
        </P>
        <Callout title="Privacy questions">
          We answer every privacy question within {RESPONSE_DAYS} days, free of charge:{' '}
          <Mail address={CONTACT.privacy} />.
        </Callout>
      </Section>

      <Section id="what-the-product-does" title="What the product does">
        <P>
          Fellow Owners gives creators a space of their own. Creators share a single link in their
          social bio. Fans join interest-focused communities, post ideas and fan projects, form
          crews, and send structured ideas to the creator. An AI assistant, set up to match what the
          creator loves, writes summaries and match ratings to help creators sort through incoming
          collabs.
        </P>
      </Section>

      <Section id="what-we-collect" title="What we collect">
        <P>
          Following the principle of data minimization (GDPR Art. 5(1)(c)), we collect only what the
          service needs:
        </P>
        <UL>
          <li>
            <strong>Account credentials:</strong> Your email address, your chosen public display
            name, your username, and a salted hash of your password (never the password itself). If
            you sign in with Google, Apple or Facebook instead, that provider gives us your name and
            email address, plus your profile picture from Google or Facebook. Apple can give us a
            private relay address in place of your email.
          </li>
          <li>
            <strong>Social profile (optional):</strong> The platform and handle you add when you
            create your account, such as your Instagram or TikTok handle, so creators and fans can
            find you.
          </li>
          <li>
            <strong>Community profile:</strong> Profile headline, links, and skill tags that you
            choose to share within a space.
          </li>
          <li>
            <strong>Content submissions:</strong> Posts, comments, ideas, replies, and fan-project
            descriptions you post.
          </li>
          <li>
            <strong>Community joins:</strong> The spaces you have joined and signals (reactions) you
            leave on posts.
          </li>
          <li>
            <strong>Session records:</strong> Secure session rows recording IP address and
            user-agent purely to protect your account and display active sessions.
          </li>
          <li>
            <strong>Newsletter sign-up (optional):</strong> Only your email address, if you type it
            into the footer box. See <A href="#newsletter">the newsletter</A>.
          </li>
          <li>
            <strong>Aggregated link analytics:</strong> Clicks on links to featured fan projects
            record referring platform and an irreversible, one-way cryptographic hash of IP,
            user-agent, and date. This counts unique daily visitors without identifying individuals.
          </li>
        </UL>
      </Section>

      <Section id="what-we-never-collect" title="What we never collect or sell">
        <Callout title="We do not sell your data">
          We do not sell personal data, take no part in behavioral tracking, and do not make money
          from your attention.
        </Callout>
        <P>We never collect, store or monitor:</P>
        <UL>
          <li>Payment card details, bank accounts, or financial records (the product is free).</li>
          <li>
            Your password in readable form: we store only a salted, one-way scrypt hash of it.
          </li>
          <li>Precise GPS location or background geolocation tracking.</li>
          <li>Device address books, contacts, camera feeds, photo rolls, or microphone access.</li>
          <li>Social media passwords, private direct messages, or off-platform viewing habits.</li>
          <li>Cross-app tracking identifiers (e.g. IDFA, AAID) or data-broker enrichment data.</li>
          <li>Government identification numbers, biometric data, or special category data.</li>
        </UL>
      </Section>

      <Section id="how-we-use-it" title="How we use your data">
        <UL>
          <li>
            To log you in securely, confirm your email address, and reset a forgotten password.
          </li>
          <li>To display your public submissions and profile within communities you join.</li>
          <li>To generate AI summaries and match ratings solely for the space creator.</li>
          <li>To compile aggregate, anonymized referral statistics for featured fan projects.</li>
          <li>To protect the platform against fraud, scraping, and abuse.</li>
          <li>To answer your support requests and fulfill privacy rights inquiries.</li>
        </UL>
      </Section>

      <Section id="ai" title="AI processing, and no training on your content">
        <Callout title="Your content does not train AI models">
          Neither Fellow Owners nor our AI providers (Anthropic, and OpenAI through OpenRouter) use
          your text, ideas or creative work to train AI models.
        </Callout>
        <UL>
          <li>
            <strong>Models we use:</strong> {AI_MODELS.join('; ')}.
          </li>
          <li>
            <strong>Data isolation:</strong> Your email address, payment details, and private
            account identifiers are never transmitted to AI inference APIs; only the text of the
            item and the creator&rsquo;s criteria are processed.
          </li>
          <li>
            <strong>No automated decisions:</strong> The AI never acts on its own. It does not
            accept or reject fans, reply to messages, or delete content. Every decision requires a
            human creator&rsquo;s explicit review and action.
          </li>
        </UL>
      </Section>

      <Section id="who-sees-what" title="Who sees what">
        <UL>
          <li>
            <strong>Other fans in a community:</strong> See your display name, public bio, skills,
            posts, and comments. <em>They never see your email address.</em>
          </li>
          <li>
            <strong>Space owners (creators):</strong> See what you post or send into their space,
            along with private AI summaries and match ratings.{' '}
            <em>Creators never receive your email address.</em>
          </li>
          <li>
            <strong>The general public:</strong> Sees only the fan projects and Fans of the week
            that a creator explicitly publishes to the public web.
          </li>
        </UL>
        <P>
          <strong>Fans of the week:</strong> A creator can feature a fan in &ldquo;Fans of the
          week&rdquo; on their public page. When they do, the page shows your name, your avatar and
          the note the creator wrote about you, and anyone with the link can see it. You can ask the
          creator to take it down, or write to <Mail address={CONTACT.privacy} /> and we will remove
          it, with no reason needed.
        </P>
      </Section>

      <Section id="cookies" title="Cookies">
        <P>
          Fellow Owners sets only four first-party cookies, all of which are strictly necessary for
          session authentication under the EU ePrivacy Directive (Article 5(3)):
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
          In production the names carry the <code>__Secure-</code> prefix. The{' '}
          <A href="/cookies">cookie policy</A> also lists what we keep in browser storage.
        </Meta>
      </Section>

      <Section id="processors" title="Who processes data for us">
        <P>
          Each provider below processes data for us under a data processing agreement (DPA) that
          includes standard contractual clauses:
        </P>
        <Table
          label="Processors"
          head={['Processor', 'What it does', 'Data it handles', 'Where']}
          rows={PROCESSORS.map((processor) => ({
            key: processor.name,
            cells: [
              <A key="name" href={processor.policy}>
                {processor.name}
              </A>,
              processor.does,
              processor.data,
              processor.where,
            ],
          }))}
        />
        <Meta>
          There are no advertising SDKs in the product, and no tracking tags from Meta, Google Ads,
          ByteDance or data brokers.
        </Meta>
      </Section>

      <Section id="retention" title="How long we keep data">
        <P>We keep personal data only as long as the service needs it:</P>
        <Table
          label="How long we keep data"
          head={['Data', 'How long we keep it']}
          rows={RETENTION.map((row) => ({ key: row.what, cells: [row.what, row.how] }))}
        />
        <Meta>A nightly job deletes records once their time is up.</Meta>
      </Section>

      <Section id="your-rights" title="Your privacy rights">
        <P>Wherever you live, you have these rights with Fellow Owners:</P>
        <UL>
          <li>
            <strong>Right to know and access:</strong> get a complete copy of the data we hold about
            you.
          </li>
          <li>
            <strong>Right to rectification:</strong> correct inaccurate or incomplete profile
            details.
          </li>
          <li>
            <strong>Right to erasure:</strong> permanently delete your account and personal data.
          </li>
          <li>
            <strong>Right to data portability:</strong> receive your data in a structured,
            machine-readable format.
          </li>
          <li>
            <strong>Right to object and restrict:</strong> withdraw consent or restrict processing.
          </li>
        </UL>
        <P>We answer every verifiable request within {RESPONSE_DAYS} days, free of charge.</P>
      </Section>

      <Section id="deletion" title="Deleting your account and data">
        <P>
          You can delete your account and your personal information at any time. Write the request
          below, or email <Mail address={CONTACT.privacy} /> with the subject &ldquo;Delete my
          account&rdquo;.
        </P>

        <DataRequest />

        <P>When account deletion is confirmed:</P>
        <UL>
          <li>Your account, email, profile and community joins are deleted at once.</li>
          <li>
            Your posts and comments are stripped of identity, attributed to &ldquo;Former fan&rdquo;
            to preserve conversational context for other collaborators (or deleted upon request).
          </li>
          <li>Private ideas you sent to creators are removed.</li>
          <li>Backups roll off completely within 30 days.</li>
        </UL>
      </Section>

      <Section id="email" title="The email we send">
        <P>
          <strong>Transactional email only:</strong> The only automated emails Fellow Owners sends
          are six-digit codes (to confirm your email address when you create an account, or to reset
          a forgotten password) and formal privacy notices.
        </P>
        <P>
          Apart from our own newsletter (see below), we do not send marketing email, third-party
          newsletters or sponsored messages. If any other optional marketing email is ever
          introduced, it will need your explicit double opt-in and will carry a one-click
          unsubscribe (RFC 8058) and our registered postal address.
        </P>
      </Section>

      <Section id="newsletter" title="The newsletter">
        <P>
          The sign-up box in the footer asks for one thing: your email address. That is all we
          store, along with where you signed up (the footer). We do not ask for a name, and we do
          not match the address to an account or to anything you do in the product.
        </P>
        <P>
          We use it for one purpose: to send you the occasional note about what is new at{' '}
          {OPERATOR.name}. We do not sell it, share it with advertisers or hand it to creators.
          Signing up twice does nothing, and the box answers the same way whether or not you were
          already on the list, so nobody can use it to find out who is subscribed. To stop the
          emails, use the unsubscribe link at the bottom of any newsletter, or write to{' '}
          <Mail address={CONTACT.privacy} /> and we will remove your address within {RESPONSE_DAYS}{' '}
          days. You can ask for it to be deleted the same way, or with the{' '}
          <A href="#deletion">request form above</A>.
        </P>
        <Meta>
          To keep the box from being abused, it accepts five sign-ups a minute from one network
          address. Past that it asks you to try again shortly.
        </Meta>
      </Section>

      <Section id="transfers" title="International data transfers">
        <P>
          Primary infrastructure is located in the United States and the European Union. Transfers
          of personal data originating from the EEA, United Kingdom, or Switzerland are governed by
          the European Commission&rsquo;s Standard Contractual Clauses (SCCs) and the UK
          International Data Transfer Addendum.
        </P>
      </Section>

      <Section id="children" title={`Adults only (${MIN_AGE}+)`}>
        <Callout title={`For people aged ${MIN_AGE} and older`}>
          Fellow Owners is for adult creators and their fans. We do not knowingly collect, ask for
          or store personal information from anyone under {MIN_AGE}.
        </Callout>
        <P>
          If you are a parent or legal guardian and believe that your child under {MIN_AGE} has
          submitted personal information, contact us at <Mail address={CONTACT.privacy} />. We will
          verify and permanently delete the minor&rsquo;s account and all submissions within 48
          hours.
        </P>
      </Section>

      <Section id="security" title="Security">
        <UL>
          <li>TLS 1.3 encryption for all data in transit over public networks.</li>
          <li>
            Session cookies are protected with <code>httpOnly</code>, <code>secure</code>, and{' '}
            <code>SameSite=Lax</code> flags.
          </li>
          <li>
            Passwords are stored only as salted scrypt hashes, and email codes only as hashes.
          </li>
          <li>
            Log-in, sign-up and code requests are rate limited. Codes expire after 10 minutes and
            stop working after 5 wrong tries, and resetting your password ends every session.
          </li>
          <li>Row-level security (RLS) limits database queries to the spaces you belong to.</li>
          <li>Encrypted daily database snapshots, deleted automatically when they expire.</li>
        </UL>
      </Section>

      <Section id="changes" title="Policy updates">
        <P>
          We post any updates directly to this page with an updated revision date. In the event of
          material changes affecting your privacy rights, we will provide prominent in-app notices
          prior to implementation.
        </P>
      </Section>

      <Section id="contact" title="Contact">
        <P>
          To ask a privacy question or exercise your rights:
          <br />
          <strong>Email:</strong> <Mail address={CONTACT.privacy} />
          <br />
          <strong>Post:</strong> {OPERATOR.entity}, Attn: Privacy, {OPERATOR.address}
        </P>
      </Section>

      <Section id="eea-uk" title="EEA and UK legal basis supplement">
        <P>Under GDPR and UK GDPR Article 6, our processing grounds are:</P>
        <UL>
          <li>
            <strong>Performance of a contract (Art. 6(1)(b)):</strong> running your account,
            community features and the delivery of your posts.
          </li>
          <li>
            <strong>Legitimate interests (Art. 6(1)(f)):</strong> keeping the service secure,
            preventing spam and abuse, and counting aggregate link clicks.
          </li>
          <li>
            <strong>Legal obligation (Art. 6(1)(c)):</strong> meeting statutory retention or law
            enforcement obligations.
          </li>
        </UL>
      </Section>

      <Section id="california" title="California privacy rights (CCPA/CPRA)">
        <P>
          Under the California Consumer Privacy Act as amended by the CPRA, California residents
          have the right to know, delete, correct, and opt-out of the sale or sharing of their
          personal information.
        </P>
        <P>
          <strong>Notice of no sale or sharing:</strong> Fellow Owners does not sell personal
          information and has never shared personal information for cross-context behavioral
          advertising. We do not use sensitive personal data for profiling.
        </P>
      </Section>
    </LegalShell>
  );
}
