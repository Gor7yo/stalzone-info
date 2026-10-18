import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { CONTACT_LABEL, CONTACT_URL } from "@/lib/creator";
import styles from "@/components/Doc/Doc.module.css";

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

const STEPS = [
  { id: "start", title: "С чего начать" },
  { id: "market", title: "Цены на рынке" },
  { id: "sell", title: "За сколько продать" },
  { id: "alerts", title: "Алерты в Telegram" },
  { id: "flips", title: "Флиппер" },
  { id: "emission", title: "Выбросы" },
  { id: "players", title: "Игроки и кланы" },
  { id: "pro", title: "Pro" },
];

export default function GuidePage() {
  return (
    <main className="page">
      <PageHeader eyebrow="Гайд" title="Как пользоваться">
        Пять минут чтения - и вы знаете, где смотреть цены, за сколько продавать и как ловить выгодные лоты.
      </PageHeader>

      <div className={styles.doc}>
        <nav className={styles.toc} aria-label="Разделы гайда">
          {STEPS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="chip">
              {s.title}
            </a>
          ))}
        </nav>

        {VIDEOS.length > 0 && (
          <section className="stack" style={{ gap: 12 }}>
            {VIDEOS.map((v) => (
              <figure key={v.src} style={{ margin: 0, display: "grid", gap: 6 }}>
                <div className={styles.video}>
                  <iframe src={v.src} title={v.title} loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen />
                </div>
                <figcaption className="dim" style={{ fontSize: 13 }}>
                  {v.title}
                </figcaption>
              </figure>
            ))}
          </section>
        )}

        <h2 id="start">1. С чего начать</h2>
        <ol>
          <li>
            Выберите <strong>регион</strong> сервера (RU, EU, NA, SEA) переключателем вверху главной - цены у регионов разные.
          </li>
          <li>
            Найдите предмет через <strong>поиск на главной</strong>: можно писать по-русски, по-английски и даже в неправильной раскладке.
            Туда же можно вписать ник игрока.
          </li>
          <li>
            Чтобы работали алерты и Pro, <Link href="/account">войдите через EXBO</Link>. Пароль вводится только на exbo.net - сайт его не
            видит.
          </li>
        </ol>
        <p>
          Сайт также открывается как мини-приложение в Telegram: <a href="https://t.me/stalzoneinfo_bot">@stalzoneinfo_bot</a>.
        </p>

        <h2 id="market">2. Цены на рынке</h2>
        <p>
          В разделе <Link href="/auction">Рынок</Link> откройте предмет. Там видно:
        </p>
        <ul>
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
        <p>
          Нажмите ★, чтобы добавить предмет в избранное: его лучшая цена появится на главной в блоке «Мой рынок». На главной же есть{" "}
          <strong>Радар рынка</strong> - что за сутки подорожало, подешевело и где больше всего сделок.
        </p>

        <h2 id="sell">3. За сколько продать</h2>
        <p>
          На странице предмета есть блок <strong>«По какой цене продать»</strong>. Он смотрит на прошлые сделки и текущие лоты и
          подсказывает цену, по которой предмет уйдёт быстро, и цену, при которой выгоднее, но придётся подождать (функция Pro). Без Pro
          ориентируйтесь на историю продаж того же качества и заточки. Помните про комиссию аукциона 5 %.
        </p>

        <h2 id="alerts">4. Алерты в Telegram</h2>
        <ol>
          <li>
            Войдите через EXBO и в <Link href="/account">Аккаунте</Link> нажмите «Привязать Telegram» - бот откроется сам, нажмите в нём «✅
            Привязать».
          </li>
          <li>
            На странице предмета нажмите <strong>«Уведомить о цене»</strong> и укажите цену. Когда появится лот дешевле - бот пришлёт
            сообщение.
          </li>
          <li>В боте можно включить уведомления о выбросе для нужных регионов.</li>
        </ol>
        <p>Бесплатно - один ценовой алерт на любое качество и заточку, в Pro - до 20 и с точным вариантом.</p>

        <h2 id="flips">5. Флиппер</h2>
        <p>
          <Link href="/flips">Флиппер</Link> ищет лоты, выставленные заметно дешевле, чем предмет обычно продаётся. Схема простая: выкупили
          - выставили по рыночной цене - забрали разницу.
        </p>
        <ul>
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

        <h2 id="emission">6. Выбросы</h2>
        <p>
          В разделе <Link href="/emission">Выброс</Link> - идёт ли выброс сейчас во всех регионах и когда был последний. Уведомления о
          начале выброса приходят в Telegram-бота.
        </p>

        <h2 id="players">7. Игроки и кланы</h2>
        <p>
          В <Link href="/character">Игроках</Link> найдите персонажа по нику: статистика и клан. В <Link href="/clans">Кланах</Link> -
          рейтинг и составы. Если вы вошли через EXBO, сайт сам найдёт ваших персонажей.
        </p>

        <h2 id="pro">8. Pro</h2>
        <p>
          <Link href="/pro">Pro</Link> открывает флиппер, флип-алерты, помощник продажи, графики, точные фильтры и до 20 ценовых алертов.
          Первые 3 дня можно попробовать бесплатно. Pro привязан к аккаунту EXBO - работает и на сайте, и в Telegram.
        </p>

        <section className={`glass ${styles.card}`}>
          <strong>Остались вопросы?</strong>
          <span>
            Напишите: <a href={CONTACT_URL}>{CONTACT_LABEL}</a>. По частым вопросам допишем гайд.
          </span>
        </section>
      </div>
    </main>
  );
}
