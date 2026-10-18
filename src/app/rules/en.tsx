import Link from "next/link";
import { type DocSection, docStyles as styles } from "@/components/Doc/DocPage";
import { CONTACT_LABEL_EN, CONTACT_URL } from "@/lib/creator";

/** Английская версия правил — те же разделы и условия, что в page.tsx. Меняете одну — меняйте обе. */
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
          Use the site and the bot as much as you like - <strong>for yourself</strong>.
        </li>
        <li>
          Don&apos;t <strong>scrape data with bots</strong>, bypass Pro limits or create extra accounts to get the trial again.
        </li>
        <li>
          Prices and flips are <strong>an estimate, not a guarantee</strong> of profit. Trading decisions are yours.
        </li>
        <li>
          Pro is paid in advance and <strong>is not refunded</strong> - except for individual cases decided by support.
        </li>
        <li>
          Violations may get your access <strong>restricted</strong> - temporarily or permanently.
        </li>
      </ul>
    ),
  },
  {
    id: "about",
    icon: "home",
    accent: "var(--cyan)",
    title: "About the service",
    hint: "What it is and where data comes from",
    body: (
      <>
        <p>
          STALZONE INFO is the stalzone-info.ru website, the mini app and the Telegram bot @stalzoneinfo_bot (the «service»). It is an{" "}
          <strong>unofficial fan project</strong>: it is not affiliated with or endorsed by EXBO.
        </p>
        <p>
          Market, player, clan and emission data comes from the public EXBO API and the service&apos;s own deals database. The service only
          reads public data and never acts on your behalf in the game.
        </p>
        <p className={styles.tip}>
          By using the service you agree to these terms and the <Link href="/privacy">privacy policy</Link>. If you don&apos;t agree, please
          don&apos;t use the service.
        </p>
      </>
    ),
  },
  {
    id: "account",
    icon: "user",
    accent: "#5aa9ff",
    title: "Account",
    hint: "EXBO sign-in and Telegram",
    body: (
      <ul className={styles.list}>
        <li>
          You sign in with your EXBO account. The password is entered <strong>only on the EXBO website</strong> - the service never receives
          or stores it.
        </li>
        <li>Linking Telegram is optional - it&apos;s needed for alerts, the trial and Pro payments.</li>
        <li>
          One Telegram is linked to one account. If you link it to another account, it is unlinked from the previous one, and that
          account&apos;s Pro stops working in it.
        </li>
        <li>You are responsible for actions taken under your account. Don&apos;t share access to your EXBO account and Telegram.</li>
      </ul>
    ),
  },
  {
    id: "allowed",
    icon: "sparkle",
    accent: "#7ee081",
    title: "What you can do",
    hint: "Use it and share it",
    body: (
      <ul className={styles.list}>
        <li>use the site, the mini app and the bot for your own game - for free or with Pro;</li>
        <li>share links to the service&apos;s pages and screenshots of prices and charts;</li>
        <li>talk about the service in chats, forums and videos - we&apos;d appreciate it;</li>
        <li>suggest ideas and report bugs through support.</li>
      </ul>
    ),
  },
  {
    id: "forbidden",
    icon: "close",
    accent: "#ff5b79",
    title: "What's not allowed",
    hint: "Bots, Pro bypass, extra accounts, fraud",
    body: (
      <>
        <ul className={styles.list}>
          <li>
            <strong>scraping the service</strong> automatically (parsers, bots, scripts) or creating load that affects others;
          </li>
          <li>
            <strong>bypassing Pro limits</strong>: tampering with requests, using someone else&apos;s Pro, creating other accounts or
            Telegrams to get the trial again;
          </li>
          <li>
            <strong>sharing or reselling</strong> Pro access or data from Pro features (e.g. the flipper feed) to other people;
          </li>
          <li>hacking the service or exploiting vulnerabilities you find;</li>
          <li>using the service for fraud or to deceive other players;</li>
          <li>spamming, threatening or insulting support.</li>
        </ul>
        <p className={styles.tip}>🛡 Found a vulnerability? Don&apos;t use it - tell support. We&apos;ll be grateful.</p>
      </>
    ),
  },
  {
    id: "pro",
    icon: "star",
    accent: "#ffb547",
    title: "Pro and the trial",
    hint: "What's included and how it works",
    body: (
      <ul className={styles.list}>
        <li>
          <Link href="/pro">Pro</Link> is paid access to extra features for the paid period. The price and period are shown on the Pro page.
        </li>
        <li>Pro lives on your EXBO account and works on the site, in the mini app and in the bot.</li>
        <li>
          <strong>The trial</strong> is 3 free days, given after linking Telegram, once per account and per Telegram.
        </li>
        <li>
          Features may change: we keep developing the service and sometimes rework things. The current list of Pro features is on the Pro
          page.
        </li>
      </ul>
    ),
  },
  {
    id: "payment",
    icon: "tag",
    accent: "#ffc94a",
    title: "Payments and refunds",
    hint: "No refunds, with rare exceptions",
    body: (
      <>
        <ul className={styles.list}>
          <li>
            Payment goes through <strong>Tribute</strong> in Telegram, by card or Telegram Stars. Pro turns on right after payment and the
            bot sends a confirmation.
          </li>
          <li>Pay from the Telegram linked to your account - otherwise Pro won&apos;t find your account.</li>
          <li>
            <strong>No refunds</strong>: you pay for access that is opened right away for the paid period.
          </li>
          <li>
            <strong>Exceptions are possible</strong> - in individual cases, at support&apos;s discretion. If something went wrong with a
            payment, contact support with the «Оплата и Pro» (Payment and Pro) topic and attach a screenshot of the payment.
          </li>
        </ul>
        <p className={styles.tip}>The payment terms themselves (fees, methods) are set by Tribute and Telegram.</p>
      </>
    ),
  },
  {
    id: "support",
    icon: "help",
    accent: "#c08bff",
    title: "Support",
    hint: "Tickets and replies",
    body: (
      <ul className={styles.list}>
        <li>
          Support works in the Telegram bot: <Contact />. Pick a topic and describe your question, screenshots welcome. The bot speaks
          Russian, but you can write in English.
        </li>
        <li>A real person answers. We try to reply quickly but can&apos;t guarantee an exact response time.</li>
        <li>Spam protection: up to 5 new tickets per day, up to 3 open at once and up to 20 messages per hour.</li>
        <li>After a ticket is closed you can rate the answer - it helps us improve.</li>
      </ul>
    ),
  },
  {
    id: "violations",
    icon: "shield",
    accent: "var(--ember)",
    title: "Violations and restrictions",
    hint: "What happens if you break the rules",
    body: (
      <>
        <p>Breaking the rules may get your account restricted - temporarily or permanently. A restriction applies everywhere:</p>
        <ul className={styles.list}>
          <li>account features on the site and in the mini app (Pro, alerts, flipper) stop working;</li>
          <li>the bot stops replying and sending notifications.</li>
        </ul>
        <p>
          We may restrict access without warning if a violation harms the service or other people. Paid Pro is not refunded in this case.
        </p>
        <p className={styles.tip}>Think a restriction is a mistake? Contact support and we&apos;ll look into it.</p>
      </>
    ),
  },
  {
    id: "warranty",
    icon: "clock",
    accent: "#5aa9ff",
    title: "No guarantees",
    hint: "An estimate, not a promise",
    body: (
      <>
        <p>
          Prices, flips, hints and forecasts are <strong>an estimate based on past deals</strong>, not a promise of profit. Someone may buy
          a lot before you, prices may change, EXBO data may arrive late or with errors.
        </p>
        <p>You make your own trading decisions in the game, and the service is not responsible for their outcome or for in-game losses.</p>
        <p className={styles.tip}>
          The service is provided «as is». We do our best to keep it running, but there may be breaks for updates and outages - including on
          the EXBO and Telegram side.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    icon: "trophy",
    accent: "#7ee081",
    title: "Rights to materials",
    hint: "Who owns what",
    body: (
      <ul className={styles.list}>
        <li>Game names, images and trademarks belong to their owners.</li>
        <li>The service&apos;s design, code and texts belong to the project author.</li>
        <li>Sharing links and screenshots is fine; copying the whole service or passing it off as your own is not.</li>
      </ul>
    ),
  },
  {
    id: "changes",
    icon: "refresh",
    accent: "var(--acc)",
    title: "Changes to the terms",
    hint: `Version of ${UPDATED_EN}`,
    body: (
      <p>
        These terms may be updated - the version date is shown at the top. We&apos;ll announce important changes on the site or in the bot.
        By continuing to use the service after changes, you accept the new version.
      </p>
    ),
  },
];
