import type { Metadata } from "next";
import Link from "next/link";
import { type DocSection, DocPage, docStyles as styles, Steps } from "@/components/Doc/DocPage";
import { Icon } from "@/components/Icon";
import { getLang } from "@/i18n/server";
import { CONTACT_LABEL, CONTACT_LABEL_EN, CONTACT_URL } from "@/lib/creator";
import { SECTIONS_EN } from "./en";

export const metadata: Metadata = {
  title: "Гайд: как пользоваться",
  description:
    "Как пользоваться STALZONE INFO: цены на рынке, лучшая цена продажи, алерты в Telegram, флиппер, выбросы, профили игроков и кланы.",
  alternates: { canonical: "/guide" },
};

/**
 * Видео-гайды. Ссылка для встраивания: YouTube - https://www.youtube.com/embed/<id>,
 * VK Видео - https://vkvideo.ru/video_ext.php?oid=…&id=…, Rutube - https://rutube.ru/play/embed/<id>.
 * Пустой список - блока с видео нет.
 */
const VIDEOS: { title: string; src: string }[] = [];

const SECTIONS: DocSection[] = [
  {
    id: "start",
    icon: "bolt",
    accent: "var(--acc)",
    title: "С чего начать",
    hint: "Регион, поиск и вход - за минуту",
    body: (
      <>
        <Steps>
          {[
            <>
              Выберите <strong>регион</strong> сервера (RU, EU, NA, SEA) переключателем вверху главной - цены у регионов разные.
            </>,
            <>
              Найдите предмет через <strong>поиск на главной</strong>: по-русски, по-английски и даже в неправильной раскладке. Туда же
              можно вписать ник игрока.
            </>,
            <>
              Чтобы работали алерты и Pro, <Link href="/account">войдите через EXBO</Link>. Пароль вводится только на exbo.net - сайт его не
              видит.
            </>,
          ]}
        </Steps>
        <p className={styles.tip}>
          💡 Сайт открывается и как мини-приложение в Telegram: <a href="https://t.me/stalzoneinfo_bot">@stalzoneinfo_bot</a>.
        </p>
      </>
    ),
  },
  {
    id: "market",
    icon: "market",
    accent: "#5aa9ff",
    title: "Цены на рынке",
    hint: "Лоты, история продаж, качество",
    body: (
      <>
        <p>
          В разделе <Link href="/auction">Рынок</Link> откройте предмет. Там видно:
        </p>
        <ul className={styles.list}>
          <li>
            <strong>лоты</strong>, которые выставлены прямо сейчас, - с ценой выкупа и ценой за штуку;
          </li>
          <li>
            <strong>историю продаж</strong> - по каким ценам предмет реально покупали;
          </li>
          <li>
            <strong>фильтры по качеству и заточке</strong> - у артефактов, оружия и брони цена сильно от них зависит, сравнивайте
            одинаковые.
          </li>
        </ul>
        <p className={styles.tip}>
          ⭐ Нажмите звёздочку - лучшая цена предмета появится на главной в «Моём рынке». Там же <strong>Радар рынка</strong>: что за сутки
          подорожало, подешевело и где больше всего сделок.
        </p>
      </>
    ),
  },
  {
    id: "sell",
    icon: "tag",
    accent: "#ffc94a",
    title: "За сколько продать",
    hint: "Цена, по которой лот уйдёт",
    body: (
      <>
        <p>
          На странице предмета есть блок <strong>«По какой цене продать»</strong>. Он смотрит на прошлые сделки и текущие лоты и
          подсказывает цену, по которой предмет уйдёт быстро, и цену, при которой выгоднее, но придётся подождать.
        </p>
        <p className={styles.tip}>
          Это функция Pro. Без Pro ориентируйтесь на историю продаж того же качества и заточки. И помните про комиссию аукциона 5 %.
        </p>
      </>
    ),
  },
  {
    id: "alerts",
    icon: "bell",
    accent: "#c08bff",
    title: "Алерты в Telegram",
    hint: "Бот напишет, когда станет дешевле",
    body: (
      <>
        <Steps>
          {[
            <>
              Войдите через EXBO и в <Link href="/account">Аккаунте</Link> нажмите «Привязать Telegram» - бот откроется сам, нажмите в нём
              «✅ Привязать».
            </>,
            <>
              На странице предмета нажмите <strong>«Уведомить о цене»</strong> и укажите цену. Появится лот дешевле - бот пришлёт сообщение.
            </>,
            <>В меню бота можно включить уведомления о выбросе для нужных регионов.</>,
          ]}
        </Steps>
        <p className={styles.tip}>Бесплатно - один ценовой алерт на любое качество и заточку, в Pro - до 20 и с точным вариантом.</p>
      </>
    ),
  },
  {
    id: "flips",
    icon: "sparkle",
    accent: "#7ee081",
    title: "Флиппер",
    hint: "Купить дешевле - продать по рынку",
    body: (
      <>
        <p>
          <Link href="/flips">Флиппер</Link> ищет лоты, выставленные заметно дешевле, чем предмет обычно продаётся. Схема простая:
        </p>
        <div className={styles.flow} aria-label="Выкупили, выставили по рыночной цене, забрали разницу">
          <span>Выкупили</span>
          <Icon name="chevron" size={16} />
          <span>Выставили по рынку</span>
          <Icon name="chevron" size={16} />
          <span>Забрали разницу</span>
        </div>
        <ul className={styles.list}>
          <li>
            <strong>Прибыль</strong> считается уже за вычетом комиссии 5 %.
          </li>
          <li>
            <strong>Надёжность</strong>: «надёжно» - много сделок с тем же качеством и заточкой и небольшой разброс цен; «рискованно» -
            сделок мало, цена может не повториться.
          </li>
          <li>Модули показаны отдельным блоком ниже: продаются они медленнее обычных предметов.</li>
          <li>Лот могли уже выкупить - действуйте быстро. Флип-алерты в Telegram присылают такие лоты сразу.</li>
        </ul>
      </>
    ),
  },
  {
    id: "emission",
    icon: "radiation",
    accent: "var(--ember)",
    title: "Выбросы",
    hint: "Где идёт выброс прямо сейчас",
    body: (
      <p>
        В разделе <Link href="/emission">Выброс</Link> - идёт ли выброс сейчас во всех регионах и когда был последний. Уведомление о начале
        выброса бот пришлёт в Telegram.
      </p>
    ),
  },
  {
    id: "players",
    icon: "users",
    accent: "var(--cyan)",
    title: "Игроки и кланы",
    hint: "Профили, статистика, рейтинг",
    body: (
      <p>
        В <Link href="/character">Игроках</Link> найдите персонажа по нику: статистика и клан. В <Link href="/clans">Кланах</Link> - рейтинг
        и составы. Если вы вошли через EXBO, сайт сам найдёт ваших персонажей.
      </p>
    ),
  },
  {
    id: "pro",
    icon: "star",
    accent: "#ffb547",
    title: "Pro",
    hint: "Флиппер, графики, 20 алертов",
    body: (
      <>
        <p>
          <Link href="/pro">Pro</Link> открывает флиппер, флип-алерты, помощник продажи, графики, точные фильтры и до 20 ценовых алертов.
          Pro привязан к аккаунту EXBO - работает и на сайте, и в Telegram.
        </p>
        <p className={styles.tip}>🎁 Первые 3 дня - бесплатно, нужен только привязанный Telegram.</p>
      </>
    ),
  },
  {
    id: "safe",
    icon: "shield",
    accent: "#7ee081",
    title: "Это безопасно",
    hint: "Пароль не видим, данные из API EXBO",
    body: (
      <ul className={styles.list}>
        <li>
          <strong>Пароль мы не видим.</strong> Вход - через официальную страницу EXBO (exbo.net), как «Войти через Google» на других сайтах.
          Сайт получает только подтверждение, что это вы, и список ваших персонажей.
        </li>
        <li>
          <strong>Данные игры - из официального API EXBO</strong>: цены, лоты, профили, кланы, выбросы. Ничего не взламываем и в клиент игры
          не лезем.
        </li>
        <li>
          <strong>Аккаунту в игре ничего не грозит</strong>: сайт ничего не делает от вашего имени в игре - только читает открытые данные.
        </li>
        <li>
          <strong>Оплата - через Tribute</strong> в Telegram. Данные карты к нам не попадают.
        </li>
        <li>
          Не ставим рекламные трекеры и не продаём данные. Подробно - в <Link href="/privacy">политике конфиденциальности</Link>.
        </li>
      </ul>
    ),
  },
];

export default async function GuidePage() {
  // язык из cookie; метаданные (SEO) остаются русскими, как на остальных страницах
  const en = (await getLang()) === "en";
  return (
    <DocPage
      eyebrow={en ? "Guide" : "Гайд"}
      title={en ? "How to use" : "Как пользоваться"}
      lead={
        en
          ? "Five minutes - and you know where to check prices, what to sell for and how to catch good deals."
          : "Пять минут - и вы знаете, где смотреть цены, за сколько продавать и как ловить выгодные лоты."
      }
      meta={en ? ["⏱ 5 minutes", `📚 ${SECTIONS_EN.length} sections`] : ["⏱ 5 минут", `📚 ${SECTIONS.length} разделов`]}
      sections={en ? SECTIONS_EN : SECTIONS}
      numberLabel={en ? "Step" : "Шаг"}
      navLabel={en ? "Guide sections" : "Разделы гайда"}
      toTopLabel={en ? "Back to sections" : undefined}
      beforeSections={
        VIDEOS.length > 0 && (
          <section className={styles.videos}>
            {VIDEOS.map((v) => (
              <figure key={v.src}>
                <div className={styles.video}>
                  <iframe src={v.src} title={v.title} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen />
                </div>
                <figcaption>{v.title}</figcaption>
              </figure>
            ))}
          </section>
        )
      }
      final={
        en
          ? {
              title: "Still have questions?",
              body: (
                <p>
                  Contact support: <a href={CONTACT_URL}>{CONTACT_LABEL_EN}</a>. A real person answers, and we add common questions to the
                  guide.
                </p>
              ),
            }
          : {
              title: "Остались вопросы?",
              body: (
                <p>
                  Напишите в поддержку: <a href={CONTACT_URL}>{CONTACT_LABEL}</a>. Отвечает живой человек, а по частым вопросам мы допишем
                  гайд.
                </p>
              ),
            }
      }
    />
  );
}
