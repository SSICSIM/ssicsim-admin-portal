import Link from "next/link";

import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/committees", label: "Committees" },
  { href: "/delegates", label: "Delegates" }
];

export function Navbar({ currentPath = "" }: { currentPath?: string }) {
  return (
    <div className="border-b border-white/10 bg-black/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="text-sm font-semibold tracking-wide text-white" href="/dashboard">
          SSICSIM Admin
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {links.map((link) => {
            const isActive = currentPath.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/15 text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
