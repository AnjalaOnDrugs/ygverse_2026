"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { NotificationCenter } from "./NotificationCenter";

const NAV_ITEMS = [
  {
    href: "/photos",
    label: "Photos",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L6 20" />
      </svg>
    ),
  },
  {
    href: "/games",
    label: "Games",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 11h4M8 9v4" />
        <circle cx="16" cy="10" r="0.5" fill="currentColor" />
        <circle cx="18" cy="13" r="0.5" fill="currentColor" />
        <path d="M17.5 5H6.5a5 5 0 0 0-5 5.5L2 17a2.5 2.5 0 0 0 4.4 1.4L9 15h6l2.6 3.4A2.5 2.5 0 0 0 22 17l.5-6.5a5 5 0 0 0-5-5.5Z" />
      </svg>
    ),
  },
  {
    href: "/inspired",
    label: "Inspired",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    ),
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="spinner-teal" />
      </div>
    );
  }

  if (!user || pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl pb-24">
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-4 backdrop-blur-md bg-[rgba(8,8,12,0.7)]">
        <h1 className="neon-logo text-lg font-bold">YGVERSE</h1>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted sm:inline">
            Hi, <span className="text-teal">{user.username}</span>
          </span>
          <NotificationCenter />
          <button onClick={logout} className="btn-ghost cursor-pointer">
            Log out
          </button>
        </div>
      </header>

      <main className="px-4">{children}</main>

      <nav className="bottom-nav">
        <div className="mx-auto flex max-w-3xl">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
