import Link from "next/link";
import { EmptyState } from "@/components/ui/States";

export default function NotFound() {
  return (
    <main className="page" style={{ paddingTop: "20vh" }}>
      <EmptyState icon="radiation" title="Сюда не ходят" text="Такой страницы нет даже на картах сталкеров.">
        <Link href="/" className="btn primary">
          На главную
        </Link>
      </EmptyState>
    </main>
  );
}
