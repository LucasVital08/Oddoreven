"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const LINKS = [
  { href: "/", label: "Arena" },
  { href: "/lobby", label: "Lobby" },
  { href: "/how", label: "Como funciona" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/70 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-even font-display text-lg font-extrabold text-[#04120c] shadow-glow transition-transform group-hover:rotate-6">
              Ø
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">
              Odd<span className="text-even">Or</span>Even
            </span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    active ? "bg-panel-2 text-even" : "text-txt-dim hover:text-txt"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
        <ConnectButton
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          chainStatus="icon"
          showBalance={{ smallScreen: false, largeScreen: true }}
        />
      </nav>
    </header>
  );
}
