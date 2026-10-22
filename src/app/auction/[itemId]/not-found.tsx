import Link from "next/link";
import { EmptyState } from "@/components/ui/States";
import { getT } from "@/i18n/server";

/** Id нет в справочнике предметов - 404 со ссылкой на поиск по рынку. */
export default async function ItemNotFound() {
  const { t } = await getT();
  return (
    <main className="page" style={{ paddingTop: "20vh" }}>
      <EmptyState icon="radiation" title={t.item.notFoundTitle} text={t.item.notFoundText}>
        <Link href="/auction" className="btn primary">
          {t.item.market}
        </Link>
      </EmptyState>
    </main>
  );
}
