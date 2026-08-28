"use client";

import { useParams } from "next/navigation";
import styles from "./page.module.css";
import { useStore } from "@/components/MobxProvider";
import Link from "next/link";

export default function AuctionItemPage() {
	const params = useParams(); // Хук для клиента
  const itemId = params.itemId as string;

  if (!itemId) return <div>Не найдено</div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        
      </div>
    </div>
  );
}
