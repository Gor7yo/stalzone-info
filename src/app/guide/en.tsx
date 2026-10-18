import Link from "next/link";
import { type DocSection, docStyles as styles, Steps } from "@/components/Doc/DocPage";
import { Icon } from "@/components/Icon";

/** Английская версия гайда — те же разделы, иконки и цвета, что в page.tsx. */
export const SECTIONS_EN: DocSection[] = [
  {
    id: "start",
    icon: "bolt",
    accent: "var(--acc)",
    title: "Getting started",
    hint: "Region, search and sign-in in a minute",
    body: (
      <>
        <Steps>
          {[
            <>
              Pick your server <strong>region</strong> (RU, EU, NA, SEA) with the switch at the top of the home page - prices differ between
              regions.
            </>,
            <>
              Find an item with the <strong>search on the home page</strong>: in English or Russian, even with the wrong keyboard layout.
              You can also type a player&apos;s nickname there.
            </>,
            <>
              For alerts and Pro, <Link href="/account">sign in with EXBO</Link>. You enter your password only on exbo.net - the site never
              sees it.
            </>,
          ]}
        </Steps>
        <p className={styles.tip}>
          💡 The site also works as a Telegram mini app: <a href="https://t.me/stalzoneinfo_bot">@stalzoneinfo_bot</a>.
        </p>
      </>
    ),
  },
  {
    id: "market",
    icon: "market",
    accent: "#5aa9ff",
    title: "Market prices",
    hint: "Lots, sales history, quality",
    body: (
      <>
        <p>
          Open an item in the <Link href="/auction">Market</Link>. You will see:
        </p>
        <ul className={styles.list}>
          <li>
            <strong>lots</strong> listed right now - with the buyout price and the price per unit;
          </li>
          <li>
            <strong>sales history</strong> - what the item actually sold for;
          </li>
          <li>
            <strong>quality and upgrade filters</strong> - for artefacts, weapons and armor they change the price a lot, so compare like
            with like.
          </li>
        </ul>
        <p className={styles.tip}>
          ⭐ Tap the star - the item appears on the home page in «Favorites», one tap away. The home page also has the{" "}
          <strong>Market radar</strong>: what got pricier, cheaper and where most deals happened in the last 24 hours.
        </p>
      </>
    ),
  },
  {
    id: "sell",
    icon: "tag",
    accent: "#ffc94a",
    title: "What price to sell at",
    hint: "The price that actually sells",
    body: (
      <>
        <p>
          The item page has a <strong>«What price to sell at»</strong> block. It looks at past deals and current lots and suggests a price
          that sells fast and one that earns more but takes longer.
        </p>
        <p className={styles.tip}>
          This is a Pro feature. Without Pro, use the sales history for the same quality and upgrade. And remember the 5 % auction fee.
        </p>
      </>
    ),
  },
  {
    id: "alerts",
    icon: "bell",
    accent: "#c08bff",
    title: "Telegram alerts",
    hint: "The bot writes when it gets cheaper",
    body: (
      <>
        <Steps>
          {[
            <>
              Sign in with EXBO and tap «Link Telegram» in your <Link href="/account">Account</Link> - the bot opens, tap «✅ Привязать»
              («Link»; the bot speaks Russian) there.
            </>,
            <>
              On an item page tap <strong>«Price alert»</strong> and set your price. When a cheaper lot appears, the bot sends you a
              message.
            </>,
            <>In the bot menu you can turn on emission alerts for the regions you need.</>,
          ]}
        </Steps>
        <p className={styles.tip}>Free: one price alert for any quality and upgrade. Pro: up to 20, with the exact variant.</p>
      </>
    ),
  },
  {
    id: "flips",
    icon: "sparkle",
    accent: "#7ee081",
    title: "Flipper",
    hint: "Buy below market - resell at market",
    body: (
      <>
        <p>
          The <Link href="/flips">Flipper</Link> finds lots listed well below the usual price of the item. The idea is simple:
        </p>
        <div className={styles.flow} aria-label="Buy out, list at market price, keep the difference">
          <span>Buy out</span>
          <Icon name="chevron" size={16} />
          <span>List at market</span>
          <Icon name="chevron" size={16} />
          <span>Keep the difference</span>
        </div>
        <ul className={styles.list}>
          <li>
            <strong>Profit</strong> already includes the 5 % fee.
          </li>
          <li>
            <strong>Reliability</strong>: «reliable» - many deals with the same quality and upgrade and a small price spread; «risky» - few
            deals, the price may not repeat.
          </li>
          <li>Modules are shown in a separate block below: they sell slower than regular items.</li>
          <li>Someone may buy the lot first - act fast. Flip alerts in Telegram send such lots instantly.</li>
        </ul>
      </>
    ),
  },
  {
    id: "emission",
    icon: "radiation",
    accent: "var(--ember)",
    title: "Emissions",
    hint: "Where an emission is going on now",
    body: (
      <p>
        The <Link href="/emission">Emission</Link> page shows whether an emission is going on in each region and when the last one was. The
        bot sends a Telegram alert when an emission starts.
      </p>
    ),
  },
  {
    id: "players",
    icon: "users",
    accent: "var(--cyan)",
    title: "Players and clans",
    hint: "Profiles, stats, rankings",
    body: (
      <p>
        In <Link href="/character">Players</Link> find a character by nickname: stats and clan. In <Link href="/clans">Clans</Link> -
        rankings and rosters. If you signed in with EXBO, the site finds your characters automatically.
      </p>
    ),
  },
  {
    id: "pro",
    icon: "star",
    accent: "#ffb547",
    title: "Pro",
    hint: "Flipper, charts, 20 alerts",
    body: (
      <>
        <p>
          <Link href="/pro">Pro</Link> unlocks the flipper, flip alerts, the sell helper, charts, exact filters and up to 20 price alerts.
          Pro lives on your EXBO account - it works both on the site and in Telegram.
        </p>
        <p className={styles.tip}>🎁 The first 3 days are free - all you need is a linked Telegram.</p>
      </>
    ),
  },
  {
    id: "safe",
    icon: "shield",
    accent: "#7ee081",
    title: "It's safe",
    hint: "We never see your password",
    body: (
      <ul className={styles.list}>
        <li>
          <strong>We never see your password.</strong> You sign in on the official EXBO page (exbo.net), like «Sign in with Google» on other
          sites. The site only gets confirmation that it&apos;s you, and your list of characters.
        </li>
        <li>
          <strong>Game data comes from the official EXBO API</strong>: prices, lots, profiles, clans, emissions. We don&apos;t hack anything
          and don&apos;t touch the game client.
        </li>
        <li>
          <strong>Your game account is not at risk</strong>: the site never acts on your behalf in the game - it only reads public data.
        </li>
        <li>
          <strong>Payments go through Tribute</strong> in Telegram. Your card details never reach us.
        </li>
        <li>
          No ad trackers, and we don&apos;t sell data. Details - in the <Link href="/privacy">privacy policy</Link>.
        </li>
      </ul>
    ),
  },
];
