import Link from "next/link";
import { type DocSection, DocTable, docStyles as styles } from "@/components/Doc/DocPage";
import { CONTACT_LABEL_EN, CONTACT_URL, CREATOR } from "@/lib/creator";

/** Английская версия политики — те же факты и разделы, что в page.tsx. Меняете одну — меняйте обе. */
export const UPDATED_EN = "October 18, 2026";

const Contact = () => <a href={CONTACT_URL}>{CONTACT_LABEL_EN}</a>;

export const SECTIONS_EN: DocSection[] = [
  {
    id: "short",
    icon: "bolt",
    accent: "var(--acc)",
    title: "In short",
    hint: "The essentials in 30 seconds",
    body: (
      <ul className={styles.list}>
        <li>
          <strong>We never see your EXBO password</strong> - you sign in on the official EXBO page.
        </li>
        <li>
          We store <strong>only what&apos;s needed</strong> for sign-in, Pro, alerts and support.
        </li>
        <li>
          <strong>No ads, analytics counters or trackers.</strong> We don&apos;t sell data or share it with advertisers.
        </li>
        <li>
          Card details <strong>never reach us</strong> - payments are handled by Tribute.
        </li>
        <li>
          Everything can be <strong>deleted</strong> - contact support and we delete it within 30 days.
        </li>
      </ul>
    ),
  },
  {
    id: "who",
    icon: "user",
    accent: "var(--cyan)",
    title: "Who we are",
    hint: "Who is responsible for data",
    body: (
      <>
        <p>
          STALZONE INFO (the stalzone-info.ru website, the mini app and the Telegram bot @stalzoneinfo_bot) is an unofficial fan project
          built and run by a single author, <strong>{CREATOR.nick}</strong>, who is also responsible for processing your data.
        </p>
        <p>
          The project is not affiliated with EXBO. Game data (market, profiles, clans, emissions) comes from the public EXBO API and our own
          deals database.
        </p>
        <p className={styles.tip}>
          Any questions about your data: <Contact />.
        </p>
      </>
    ),
  },
  {
    id: "browser",
    icon: "home",
    accent: "#5aa9ff",
    title: "If you just browse",
    hint: "Nothing personal, settings stay with you",
    body: (
      <>
        <p>
          Without signing in we <strong>know nothing about you personally</strong>. Your settings are stored in your browser and are not
          sent to us:
        </p>
        <DocTable
          head={["Where", "What", "Why"]}
          rows={[
            [
              <code key="k">stalzone:v2</code>,
              "region, favourite items, players and clans, recent items, flipper settings",
              "so you don't have to set everything up again",
            ],
            [<code key="k">stalzone:theme</code>, "dark or light theme", "appearance"],
            [<code key="k">lang</code>, "language (cookie)", "show the site in your language"],
            [<code key="k">stalzone:tma</code>, "«opened in Telegram» flag (until the tab is closed)", "mini app layout"],
          ]}
        />
        <p>
          In the Telegram mini app your settings are also saved to Telegram cloud storage (CloudStorage), so they are the same on all your
          devices.
        </p>
        <p className={styles.tip}>
          The server counts requests per IP address to protect against spam (a per-minute limit). This counter lives in memory and is
          forgotten after a minute - we do not store IP addresses in the database.
        </p>
      </>
    ),
  },
  {
    id: "exbo",
    icon: "shield",
    accent: "#7ee081",
    title: "If you signed in with EXBO",
    hint: "Account, characters, Pro",
    body: (
      <>
        <p>
          Sign-in works like «Sign in with Google»: you enter your password <strong>on the EXBO website</strong>, and EXBO tells us
          it&apos;s you. We receive and store:
        </p>
        <DocTable
          head={["What", "Why"]}
          rows={[
            ["EXBO account ID, login and UUID", "recognise you at sign-in, attach Pro and alerts to your account"],
            ["Sign-in platform (e.g. Steam) and its ID", "provided by EXBO; shown in your account"],
            ["Your characters and clans", "show them in your account and find your profile"],
            [
              "EXBO API access keys (issued at sign-in)",
              "refresh your character list; they don't include your password, EXBO can revoke them",
            ],
            [
              "Sign-in sessions",
              "we store only a hash of the session key, not the key itself - even a database leak can't be used to sign in",
            ],
            ["Days you visited and your last visit time", "service statistics and abuse protection"],
            ["Pro expiry, trial flag, account restrictions", "so that Pro and the rules work"],
            [
              "Your referral link code, who invited you and whom you invited",
              "give invitation bonuses and enforce the limit; for the bonus we check the invitee's hours in the game in public EXBO stats",
            ],
          ]}
        />
        <p>
          Your browser keeps your session key (<code>stalzone:session</code>) and, during sign-in only, a one-time marker{" "}
          <code>stalzone:exbo-state</code> that protects sign-in from tampering.
        </p>
      </>
    ),
  },
  {
    id: "telegram",
    icon: "bell",
    accent: "#c08bff",
    title: "Telegram, the bot and support",
    hint: "Alerts, tickets, attachments",
    body: (
      <>
        <p>If you use the bot or linked Telegram to your account:</p>
        <DocTable
          head={["What", "Why"]}
          rows={[
            ["Telegram chat ID, first name and username", "so the bot can message you; the name - to address you"],
            ["Price alerts, flip alerts, emission regions", "send the notifications you turned on"],
            ["«Bot blocked» flag", "stop messaging people who blocked the bot"],
            ["Support tickets: topic, status, message text, rating", "answer your questions and keep the conversation history"],
          ]}
        />
        <p>
          <strong>Attachments</strong> (screenshots, files) sent to support stay on Telegram servers - we only keep their internal ID.
          Ticket messages are copied to a private support chat in Telegram that only the project author can see.
        </p>
        <p className={styles.tip}>
          The bot only writes about your alerts, support replies and important account events (e.g. a Pro payment). No mailings, no ads.
        </p>
      </>
    ),
  },
  {
    id: "payment",
    icon: "star",
    accent: "#ffb547",
    title: "Pro payments",
    hint: "Card details never reach us",
    body: (
      <>
        <p>
          Pro is paid through <strong>Tribute</strong> in Telegram - by card or Telegram Stars. Card number and payment details are entered
          at Tribute and <strong>never reach us</strong>.
        </p>
        <p>From Tribute we receive only:</p>
        <ul className={styles.list}>
          <li>your Telegram ID - to know whom to give Pro;</li>
          <li>the event (payment, renewal, cancellation), amount, currency and date.</li>
        </ul>
      </>
    ),
  },
  {
    id: "why",
    icon: "sparkle",
    accent: "#ffc94a",
    title: "Why we need it",
    hint: "Only to make the service work",
    body: (
      <ul className={styles.list}>
        <li>signing in and using the site, the mini app and the bot;</li>
        <li>Pro, the trial and payments;</li>
        <li>price, flip and emission alerts;</li>
        <li>answering support tickets;</li>
        <li>protection against spam, fraud and bypassing limits (e.g. getting the trial twice);</li>
        <li>overall statistics: how many people use the service - to know what to improve.</li>
      </ul>
    ),
  },
  {
    id: "where",
    icon: "market",
    accent: "var(--ember)",
    title: "Where it's stored and who we share it with",
    hint: "Frankfurt, Telegram, EXBO",
    body: (
      <>
        <DocTable
          head={["Who", "What they do"]}
          rows={[
            ["DigitalOcean", "our server and database in Frankfurt (Germany) - everything listed above is stored here"],
            ["Vercel", "serves the website pages; requests with your data go straight to our server, not through it"],
            ["EXBO", "account sign-in and game data"],
            ["Telegram", "bot messages, support attachments, mini app cloud settings"],
            ["Tribute", "Pro payments"],
          ]}
        />
        <p>We share data with no one else, except when required by law (a lawful request from public authorities).</p>
        <p className={styles.tip}>The servers are located outside Russia. By using the service you agree to this storage.</p>
      </>
    ),
  },
  {
    id: "terms",
    icon: "clock",
    accent: "#5aa9ff",
    title: "How long we keep it",
    hint: "Retention for each kind of data",
    body: (
      <DocTable
        head={["Data", "Kept for"]}
        rows={[
          ["Sign-in session", "until you sign out or 180 days of inactivity"],
          ["Telegram link code, EXBO sign-in marker", "10 minutes, single use"],
          ["EXBO API access keys", "until you sign out or EXBO revokes them"],
          ["Account, characters, Pro, alerts, tickets", "while the account exists or until you ask to delete it"],
          ["Payment records", "as long as the law requires"],
          ["Browser settings", "until you clear them"],
          ["Per-IP request counter", "1 minute, in server memory only"],
        ]}
      />
    ),
  },
  {
    id: "rights",
    icon: "user",
    accent: "#7ee081",
    title: "Your rights",
    hint: "See, unlink, delete",
    body: (
      <>
        <ul className={styles.list}>
          <li>
            <strong>See</strong> what data we have about you - contact support and we&apos;ll send it.
          </li>
          <li>
            <strong>Unlink Telegram</strong> - yourself, in your <Link href="/account">Account</Link>. The bot stops writing.
          </li>
          <li>
            <strong>Turn off notifications</strong> - with /stop in the bot or in its menu.
          </li>
          <li>
            <strong>Sign out</strong> - the session is deleted immediately.
          </li>
          <li>
            <strong>Delete everything</strong> - contact support. We delete the account and related data within 30 days; payment records may
            be kept longer if the law requires it.
          </li>
        </ul>
        <p className={styles.tip}>
          Contact: <Contact />.
        </p>
      </>
    ),
  },
  {
    id: "security",
    icon: "shield",
    accent: "#ff5b79",
    title: "How we protect it",
    hint: "HTTPS, hashes, minimal access",
    body: (
      <ul className={styles.list}>
        <li>all connections are encrypted (HTTPS);</li>
        <li>session keys and one-time codes are stored as hashes - they can&apos;t be recovered from the database;</li>
        <li>only the project author has access to the database and the support chat;</li>
        <li>we keep the minimum: for example, we don&apos;t store IP addresses or passwords.</li>
      </ul>
    ),
  },
  {
    id: "changes",
    icon: "refresh",
    accent: "var(--acc)",
    title: "Policy changes",
    hint: `Version of ${UPDATED_EN}`,
    body: (
      <p>
        This policy may be updated - the version date is shown at the top. We&apos;ll announce important changes on the site or in the bot.
        The rules of using the service are on the <Link href="/rules">Rules</Link> page.
      </p>
    ),
  },
];
