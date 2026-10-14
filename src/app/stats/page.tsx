import { StatsDashboard } from "@/components/stats-dashboard";
import { getLibraryStats } from "@/lib/lutris/client";
export const dynamic = "force-dynamic";
export default async function StatsPage() { return <StatsDashboard initialData={await getLibraryStats()} />; }
