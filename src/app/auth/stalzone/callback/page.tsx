import type { Metadata } from "next";
import { ExboCallback } from "./ExboCallback";

export const metadata: Metadata = {
  title: "Вход через EXBO",
  robots: { index: false, follow: false },
};

/** Сюда EXBO возвращает игрока после входа (адрес зарегистрирован в кабинете разработчика EXBO). */
export default function ExboCallbackPage() {
  return (
    <main className="page">
      <ExboCallback />
    </main>
  );
}
