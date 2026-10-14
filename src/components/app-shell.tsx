"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BarChart3, LibraryBig, ListTodo, SearchCheck, ShieldCheck } from "lucide-react";
import { ServiceLogo } from "./service-badge";
import { gameServices, serviceLabels } from "@/lib/lutris/services";

const links = [
  { href: "/", label: "Library", icon: LibraryBig },
  { href: "/backlog", label: "Backlog", icon: ListTodo },
  { href: "/sale-check", label: "Sale Check", icon: SearchCheck },
  { href: "/stats", label: "Statistics", icon: BarChart3 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to library content</a>
      <aside className="archive-rail">
        <Link className="brand" href="/" aria-label="My Game Library home">
          <span className="brand-mark"><Archive size={19} /></span>
          <span><b>My Game Library</b><small>Local Lutris index</small></span>
        </Link>
        <nav aria-label="Primary navigation">
          <p className="rail-label">Browse</p>
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={pathname === href ? "active" : ""} aria-current={pathname === href ? "page" : undefined}>
              <Icon size={18} />{label}
            </Link>
          ))}
        </nav>
        <div className="source-drawers" aria-label="Service shortcuts">
          <p className="rail-label">Services</p>
          {gameServices.filter((service) => service !== "other").map((service) => <Link key={service} href={`/?service=${service}`}><ServiceLogo service={service} />{serviceLabels[service]}</Link>)}
        </div>
        <div className="rail-note"><ShieldCheck size={17} /><span><b>Read-only</b><small>No game actions are exposed</small></span></div>
      </aside>
      <main className="content" id="main-content" tabIndex={-1}>{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={pathname === href ? "active" : ""} aria-current={pathname === href ? "page" : undefined}><Icon size={18} /><span>{label}</span></Link>
        ))}
      </nav>
    </div>
  );
}
