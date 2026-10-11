import type { Metadata } from "next";
import { ItemView } from "./ItemView";

export const metadata: Metadata = { title: "Предмет" };

export default async function ItemPage({ params }: PageProps<"/auction/[itemId]">) {
  const { itemId } = await params;
  return <ItemView id={decodeURIComponent(itemId)} />;
}
