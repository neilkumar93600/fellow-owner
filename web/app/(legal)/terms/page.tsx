import type { Metadata } from 'next';
import { A, Callout, LegalShell, Mail, P, Section, UL } from '@/components/legal/legal-ui';
import { CONTACT, LEGAL_UPDATED, MIN_AGE, OPERATOR } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Terms of service',
  description:
    'The rules for creators and fans using Fellow Owners: what you own, what the AI does and does not do, and what we promise while the product is free.',
  alternates: { canonical: '/terms' },
};

export default function Page() {
  return (
    <LegalShell
      path="/terms"
      title="Terms of service"
      subtitle="The ground rules for creators and fans, in plain English."
      updated={LEGAL_UPDATED}
      lead="The short version: your work stays yours, the AI advises and never acts, this version costs nothing, and either of us can walk away at any time. The full agreement is below, in plain English where the law allows."
    >
      <Section id="agreement" title="The agreement">
        <P>
          These terms are a legally binding agreement between you and {OPERATOR.entity} (operating{' '}
          {OPERATOR.name}, incorporated in {OPERATOR.country}). Using the product means accepting
          them in full. If you do not accept them, do not access or use the service.
        </P>
        <P>
          Our <A href="/privacy-policy">privacy policy</A> and <A href="/cookies">cookie policy</A>{' '}
          are incorporated into and form part of this agreement.
        </P>
      </Section>

      <Section id="service" title="What the service is">
        <P>
          A creator sets up a space, reached from one link in their bio. Fans join interest-based
          communities inside it, post ideas and fan projects, form crews, and send the creator
          structured ideas instead of direct messages. An AI assistant summarizes and rates incoming
          ideas against what the creator has written about what they love and never promote, so they
          can get through the best of their DMs efficiently. A creator can then give a fan project
          their spotlight with generated drafts in their voice, a public page, and a link that shows
          how it landed.
        </P>
        <P>
          This is version one of a pilot product. Features may evolve or be refined over time.
          Fair-use rate limits apply to protect platform stability: five ideas, twenty posts, and a
          hundred comments per space per day, and ten AI community recommendations per hour. We will
          always provide advance notice if these operational limits change.
        </P>
      </Section>

      <Section id="eligibility" title="Who can use it">
        <P>
          You must be at least {MIN_AGE} years old to create an account or use Fellow Owners. If the
          law where you reside requires an older age to enter into contracts or consent to data
          processing without parental approval, that legal age applies to you instead. By accessing
          the product, you confirm and warrant that you satisfy these requirements.
        </P>
        <Callout title="Adults only">
          We do not collect data from anyone under {MIN_AGE}. If a parent or guardian finds that
          someone under {MIN_AGE} has registered, email <Mail address={CONTACT.privacy} /> and we
          will erase the account and everything it posted within 48 hours, without conditions.
        </Callout>
        <P>
          You may not use the product on behalf of an undisclosed third-party brand or client
          without explicit authorization, nor if your account was previously suspended or terminated
          for policy violations.
        </P>
      </Section>

      <Section id="account" title="Your account">
        <P>
          You log in with your email address or username and a password, or with your Google, Apple
          or Facebook account. If you create an account with your email, you confirm the address
          with a six-digit code we send to it before your first session. We store only a salted hash
          of your password, never the password itself. You are responsible for keeping your password
          safe and for maintaining control of your email account: whoever controls your inbox can
          reset your password.
        </P>
        <P>
          Notify us immediately at <Mail address={CONTACT.support} /> if you suspect unauthorized
          access. One human, one account: you may not sell, transfer, or share your credentials, nor
          impersonate any creator, team member, or third party.
        </P>
      </Section>

      <Section id="acceptable-use" title="Acceptable use">
        <P>
          Fellow Owners is built for respectful collaboration. You agree not to post, upload,
          transmit, or engage in any of the following:
        </P>
        <UL>
          <li>
            Unlawful, defamatory, or infringing content that violates copyright, trademark, privacy,
            or intellectual property rights.
          </li>
          <li>
            Hate speech, harassment, stalking, violent threats, exploitation of minors, or content
            promoting self-harm or violence.
          </li>
          <li>
            Spam, automated bulk messages, affiliate link drops, follower-buying services, or copy
            crafted to manipulate AI ratings deceitfully.
          </li>
          <li>Impersonation of any creator, company, fan, or representative of Fellow Owners.</li>
          <li>
            Malicious scripts, scrapers, vulnerability scanners, denial-of-service tools, or
            unauthorized attempts to access private creator workspaces or fan data.
          </li>
          <li>
            Reselling platform access or harvesting community submissions to train competing models
            or compile marketing databases.
          </li>
        </UL>
        <P>
          Creators moderate their individual community spaces and retain full discretion to hide
          posts or remove fans who violate these principles. We reserve the authority to remove
          violating content across the entire network.
        </P>
      </Section>

      <Section id="your-content" title="Your content stays yours">
        <Callout title="You own your work">
          You keep full ownership of every post, idea, fan-project draft and file you submit. We do
          not use your work or private ideas to train AI models, we do not sell your submissions,
          and we do not license your content to data brokers.
        </Callout>
        <P>
          You grant us a limited, worldwide, non-exclusive license solely to host, display, back up,
          and transmit your submissions to the authorized processors (such as the database and AI
          inference endpoints described in our{' '}
          <A href="/privacy-policy#processors">privacy policy</A>) strictly as necessary to operate
          the Fellow Owners features. This limited license terminates the moment you delete your
          content or close your account.
        </P>
        <P>
          When a creator explicitly features your fan project, or names you one of their Fans of the
          week, the page that shows it becomes publicly viewable, with your name, avatar and the
          creator’s note. You may request its removal or retraction at any time by contacting the
          creator or our legal team.
        </P>
      </Section>

      <Section id="creators" title="If you own a space">
        <P>
          Space owners determine community guidelines, define focus channels, and decide which ideas
          to highlight. With that autonomy comes fundamental responsibilities:
        </P>
        <UL>
          <li>
            <strong>Community stewardship:</strong> You are the frontline moderator. Unlawful
            content must be addressed promptly upon notice.
          </li>
          <li>
            <strong>Strict privacy boundary:</strong> Fan ideas, portfolios, and profiles are
            strictly for interaction within Fellow Owners. You may not export fan information into
            off-platform CRMs, spreadsheets, or third-party mailing lists. We never provide
            fans&rsquo; email addresses to creators.
          </li>
          <li>
            <strong>Private AI evaluations:</strong> Match ratings and analysis notes are
            confidential decision aids. You may not broadcast a fan&rsquo;s rating or publicly
            contrast fans disparagingly.
          </li>
          <li>
            <strong>Truth in your spotlight:</strong> When you give a fan project your spotlight,
            you must represent the crew&rsquo;s work accurately without making deceptive or
            unsupported claims.
          </li>
        </UL>
      </Section>

      <Section id="ai" title="What the AI does, and does not">
        <UL>
          <li>
            <strong>Role of AI:</strong> The platform uses AI models to generate summaries, suggest
            community matches, judge how well an idea matches what a creator loves, and draft social
            copy.
          </li>
          <li>
            <strong>No autonomous action:</strong> The AI never acts on its own. It does not reply
            to ideas, accept fans, delete content, or publish messages. A human creator must
            actively review and click every action.
          </li>
          <li>
            <strong>Probabilistic nature:</strong> AI output may be incomplete or imprecise. A match
            rating is a subjective computational estimate, not a factual verdict on a human&rsquo;s
            worth.
          </li>
          <li>
            <strong>Human editorial duty:</strong> Space owners are legally responsible for any
            drafted copy they choose to publish publicly under their name. Always review and edit
            generated drafts.
          </li>
        </UL>
      </Section>

      <Section id="promotion" title="A spotlight is a decision, not a guarantee">
        <P>
          Using Fellow Owners or sending an idea does not guarantee creator feedback, mentorship, a
          brand deal, sponsorship, payment, a spotlight, or legal equity. &ldquo;Fellow
          owners&rdquo; is a metaphor for shared purpose and making things together, not the
          issuance of corporate stock or securities. Any brand deal, sponsorship, payment or
          agreement struck between creators and fans is strictly an independent contract between
          those parties.
        </P>
        <P>
          Short-link analytics filter automated crawlers on a best-effort basis and are provided for
          general informational purposes without contractual performance warranty.
        </P>
      </Section>

      <Section id="free" title="Free, and what that costs you">
        <Callout title="Free during this release">
          Fellow Owners is free during this release. No card is required, there are no hidden
          paywalls, no trials that turn into subscriptions, and no commission on agreements you make
          with creators.
        </Callout>
        <P>
          Because the pilot is free of charge, the service is provided on a best-effort basis
          without formal enterprise SLAs. Always maintain independent backups of critical creative
          work. If we introduce optional paid features in future versions, pricing will be fully
          transparent, opt-in only, and never retroactively applied. See{' '}
          <A href="#refunds">refunds</A> below.
        </P>
      </Section>

      <Section id="refunds" title="Refunds">
        <P>
          Fellow Owners costs nothing in this version: no card, no trial that turns into a charge,
          no per-seat fees and no commission on collabs. Below is what we commit to if paid plans
          ever launch.
        </P>

        <h3 className="mt-8 font-display text-[1.375rem] leading-[1.2] text-ink">
          There is nothing to refund
        </h3>
        <P>
          No feature of Fellow Owners needs a payment. There are no subscription tiers, credit
          packs, paid messages, idea fees or tip jars. We never ask for card details, so we hold no
          financial information about you.
        </P>
        <Callout title="Limits cannot be bought">
          Fair-use limits exist to keep the service up and to stop spam, and no amount of money
          lifts them. Nobody can pay for higher limits or for better placement. See{' '}
          <A href="#free">section 10 above</A>.
        </Callout>

        <h3 className="mt-8 font-display text-[1.375rem] leading-[1.2] text-ink">
          What we never charge for
        </h3>
        <UL>
          <li>
            <strong>No trials that turn into charges:</strong> there is no &ldquo;free trial&rdquo;
            that collects payment details and starts billing when it ends.
          </li>
          <li>
            <strong>No commission:</strong> we take nothing from any brand deal, sponsorship,
            payment or agreement a creator and a crew arrange between them.
          </li>
          <li>
            <strong>No export or exit fees:</strong> exporting your data or deleting your account is
            always free.
          </li>
          <li>
            <strong>No pre-checked add-ons:</strong> nothing in the product opts you into a paid
            service.
          </li>
        </UL>

        <h3 className="mt-8 font-display text-[1.375rem] leading-[1.2] text-ink">
          If you were charged
        </h3>
        <P>
          Fellow Owners has no billing system, so a charge in our name did not come from us and is
          fraudulent.
        </P>
        <Callout title="We never ask for payment">
          Nobody from {OPERATOR.name} will ever email you asking for card numbers, wire transfers or
          cryptocurrency. We have no payment links.
        </Callout>
        <P>
          If you see a charge naming Fellow Owners, send the details to{' '}
          <Mail address={CONTACT.support} /> and tell your bank. We will send you a written
          statement that our service takes no payments, which banks usually ask for before they
          reverse a charge.
        </P>

        <h3 className="mt-8 font-display text-[1.375rem] leading-[1.2] text-ink">
          If paid plans launch
        </h3>
        <P>If optional paid plans arrive in a later version, these commitments apply:</P>
        <UL>
          <li>
            <strong>Prices up front:</strong> the full cost, the renewal schedule and taxes are
            shown before you commit, never in fine print.
          </li>
          <li>
            <strong>No automatic conversions:</strong> a free account never moves onto a paid plan
            without your explicit opt-in.
          </li>
          <li>
            <strong>Self-serve cancellation:</strong> you can cancel in the product in as many
            clicks as it took to subscribe, with no retention calls and no exit interview.
          </li>
          <li>
            <strong>A 14-day cooling-off window:</strong> a full refund within fourteen days of
            purchase, no conditions, honoring EU and UK consumer standards worldwide.
          </li>
          <li>
            <strong>Renewal reminders:</strong> an email before any annual or multi-month renewal is
            charged.
          </li>
          <li>
            <strong>Prorated credits:</strong> if a paid feature has a substantial outage, a
            prorated refund is issued automatically.
          </li>
        </UL>

        <h3 className="mt-8 font-display text-[1.375rem] leading-[1.2] text-ink">
          Your statutory consumer rights
        </h3>
        <P>
          Consumer protection laws where you live (including the EU Consumer Rights Directive, the
          UK Consumer Rights Act and US state statutes) give you cancellation and guarantee rights.
          Nothing in this section limits those rights, which cannot be waived.
        </P>
      </Section>

      <Section id="third-parties" title="Third parties">
        <P>
          The service runs on these infrastructure providers: Vercel (hosting and edge network),
          Supabase (Postgres database and storage), Resend (email confirmation and password reset
          codes), and OpenRouter with Anthropic and OpenAI (AI models).
        </P>
        <P>
          <strong>No advertising or behavioral SDKs:</strong> We do not integrate Facebook SDKs,
          Google Analytics tracking scripts, TikTok pixels, or data-broker trackers. External links
          to third-party social networks (YouTube, Instagram, TikTok) are standard HTML links and do
          not transmit user tracking cookies.
        </P>
      </Section>

      <Section id="our-ip" title="What we own, demo content and licenses">
        <P>
          We own the proprietary source code, interface designs, trade secrets, and trademarks
          associated with {OPERATOR.name}. You may not decompile, reverse-engineer, replicate, or
          exploit our intellectual property without prior written consent.
        </P>
        <Callout title="About the demo content">
          We do not use fake reviews, invented testimonials or deceptive marketing. Demo spaces,
          people (such as Mira Lane and Priya Shah), community names and the engagement figures in
          screenshots are working interface examples, not endorsements and not a promise of any
          financial outcome.
        </Callout>
        <P>Open-source and licensed components in Fellow Owners:</P>
        <UL>
          <li>
            <strong>Inter typeface:</strong> by Rasmus Andersson, under the{' '}
            <A href="https://openfontlicense.org/open-font-license-official-text/">
              SIL Open Font License 1.1
            </A>
            . Hosted locally and unmodified. Copyright &copy; 2016 The Inter Project Authors.
          </li>
          <li>
            <strong>Instrument Serif typeface:</strong> by Instrument, under the{' '}
            <A href="https://openfontlicense.org/open-font-license-official-text/">
              SIL Open Font License 1.1
            </A>
            . Used for display headlines, unmodified. Copyright &copy; 2022 The Instrument Serif
            Project Authors.
          </li>
          <li>
            <strong>Lucide icons:</strong> licensed under the{' '}
            <A href="https://github.com/lucide-icons/lucide/blob/main/LICENSE">ISC License</A>.
            Copyright &copy; 2022 Lucide Contributors.
          </li>
          <li>
            <strong>Open-source packages:</strong> the full package list and license notices are in{' '}
            <code>NOTICE.md</code> at the root of the repository.
          </li>
        </UL>
      </Section>

      <Section id="copyright" title="Copyright complaints (DMCA)">
        <P>
          We respect intellectual property rights. If you believe your copyrighted work has been
          infringed on Fellow Owners, submit a formal notice to our designated agent at{' '}
          <Mail address={CONTACT.copyright} /> including:
        </P>
        <UL>
          <li>Identification of the copyrighted work claimed to have been infringed.</li>
          <li>The exact URL or location of the allegedly infringing material.</li>
          <li>Your full contact details (name, email, physical address, and telephone number).</li>
          <li>
            A statement made in good faith that the use is not authorized by the copyright owner,
            its agent, or the law.
          </li>
          <li>
            A sworn statement under penalty of perjury that the notification is accurate and that
            you are authorized to act on behalf of the copyright holder.
          </li>
        </UL>
        <P>Repeat infringers will have their accounts permanently terminated.</P>
      </Section>

      <Section id="termination" title="Ending it, and deleting your data">
        <P>
          You may end your agreement with Fellow Owners at any time. You can ask for your account
          and data to be deleted with the{' '}
          <A href="/privacy-policy#deletion">request form in the privacy policy</A>, or by emailing{' '}
          <Mail address={CONTACT.privacy} />.
        </P>
        <P>
          We may suspend or discontinue accounts that commit severe security infractions, spam, or
          acceptable use violations. Whenever feasible and lawful, we will provide advance notice
          and an opportunity to retrieve your content prior to account closure.
        </P>
      </Section>

      <Section id="warranties" title="Disclaimer of warranties">
        <P>
          THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS,
          WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT
          LIMITATION WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT ACCESS WILL BE CONTINUOUS, SECURE, OR ENTIRELY
          ERROR-FREE.
        </P>
        <P>
          Statutory consumer protections in jurisdictions that prohibit the exclusion of implied
          warranties remain fully preserved.
        </P>
      </Section>

      <Section id="liability" title="Limitation of liability">
        <P>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, FELLOW OWNERS INC. AND ITS OFFICERS SHALL NOT BE
          LIABLE FOR INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, NOR FOR LOSS
          OF PROFITS, REVENUE, DATA, OR GOODWILL.
        </P>
        <P>
          OUR TOTAL AGGREGATE LIABILITY ARISING FROM OR RELATED TO THESE TERMS SHALL NOT EXCEED THE
          GREATER OF THE AMOUNT YOU PAID US IN THE PRIOR TWELVE MONTHS OR ONE HUNDRED US DOLLARS
          ($100.00 USD).
        </P>
      </Section>

      <Section id="indemnity" title="Indemnity">
        <P>
          You agree to defend, indemnify, and hold harmless {OPERATOR.entity} against any
          third-party claims, liabilities, and expenses arising from your willful violation of these
          Terms, infringement of third-party rights, or unlawful submissions.
        </P>
      </Section>

      <Section id="law" title="Governing law">
        <P>
          These Terms are governed by and construed in accordance with the laws of {OPERATOR.law},
          without regard to conflict of law principles. If you are a consumer in the European Union
          or United Kingdom, mandatory consumer statutory venue rights in your country of residence
          remain unaffected.
        </P>
        <P>
          We encourage direct dispute resolution: before initiating formal proceedings, contact our
          legal counsel at <Mail address={CONTACT.legal} /> to achieve an amicable resolution.
        </P>
      </Section>

      <Section id="changes" title="Changes to these terms">
        <P>
          We post the current effective date at the top of these Terms whenever revisions occur. For
          substantive changes, we will provide visible in-app notice prior to enforcement. Continued
          use of the product after changes take effect constitutes acceptance of the updated terms.
        </P>
      </Section>

      <Section id="contact" title="Contact">
        <P>
          Send formal notices to:
          <br />
          <strong>Legal:</strong> <Mail address={CONTACT.legal} />
          <br />
          <strong>Privacy:</strong> <Mail address={CONTACT.privacy} />
          <br />
          <strong>Support:</strong> <Mail address={CONTACT.support} />
          <br />
          <strong>Postal address:</strong> {OPERATOR.entity}, {OPERATOR.address}
        </P>
      </Section>
    </LegalShell>
  );
}
