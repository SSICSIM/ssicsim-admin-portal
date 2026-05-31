"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard",  label: "Dashboard" },
  { href: "/committees", label: "Committees" },
  { href: "/delegates",  label: "Delegates" },
  { href: "/emailer",    label: "Emailer" }
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ssicsim-border)] bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
          <Image
            src="/branding/GoldLogo.png"
            alt="SSICSIM"
            width={160}
            height={36}
            unoptimized
            className="h-7 w-auto object-contain"
          />
          <span className="hidden text-[10px] font-medium tracking-widest uppercase text-[var(--ssicsim-text-muted)] border-l border-[var(--ssicsim-border)] pl-3 sm:block">
            Admin Portal
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[var(--ssicsim-brand-gold-soft)] text-[var(--ssicsim-brand-gold)]"
                    : "text-[var(--ssicsim-text-muted)] hover:bg-[var(--ssicsim-bg)] hover:text-[var(--ssicsim-text)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="flex items-center gap-3 shrink-0">
          {session ? (
            <>
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "User"}
                  className="h-7 w-7 rounded-full ring-1 ring-[var(--ssicsim-border)]"
                />
              ) : null}
              <span className="hidden text-sm text-[var(--ssicsim-text-muted)] md:block">
                {session.user?.name ?? session.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
                className="rounded-lg border border-[var(--ssicsim-border)] px-3 py-1.5 text-xs font-medium text-[var(--ssicsim-text-muted)] transition-all hover:border-[var(--ssicsim-brand-navy)] hover:text-[var(--ssicsim-brand-navy)]"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-lg bg-[var(--ssicsim-brand-navy)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2a1c00] transition-all"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
