import { BacklogBrowser } from "@/components/backlog-browser";
import { getLibraryPage } from "@/lib/lutris/client";
export const dynamic = "force-dynamic";
export default async function BacklogPage() { return <BacklogBrowser initialData={await getLibraryPage({ installation: "not-installed", sort: "playtime-low" })} />; }
