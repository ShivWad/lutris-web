import { LibraryBrowser } from "@/components/library-browser";
import { getLibraryPage } from "@/lib/lutris/client";

export const dynamic = "force-dynamic";
export default async function HomePage() { return <LibraryBrowser initialData={await getLibraryPage()} />; }
