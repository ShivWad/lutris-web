import { SaleHelper } from "@/components/sale-helper";
import { getLibraryPage } from "@/lib/lutris/client";

export const dynamic = "force-dynamic";
export default async function SaleCheckPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q = "" } = await searchParams;
  const query = (Array.isArray(q) ? q[0] ?? "" : q).slice(0, 200);
  return <SaleHelper initialData={await getLibraryPage({ query, searchScope: "title", pageSize: 12 })} initialQuery={query} />;
}
