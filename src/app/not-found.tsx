import Link from "next/link";
import { EmptyState } from "@/components/ui/States";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="page" style={{ paddingTop: "20vh" }}>
      <EmptyState icon="radiation" title={t.common.notFoundTitle} text={t.common.notFoundText}>
        <Link href="/" className="btn primary">
          {t.common.toHome}
        </Link>
      </EmptyState>
    </main>
  );
}
