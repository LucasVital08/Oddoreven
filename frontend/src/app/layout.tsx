import type { Metadata } from "next";
import { Sora, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { Ticker } from "@/components/Ticker";

const display = Sora({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const body = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "OddOrEven — Duelos On-Chain de Par ou Ímpar",
  description:
    "A arena de apostas 1v1 provavelmente justa na blockchain. Trave seu ETH, desafie qualquer um, jogue quantas rodadas quiser. O saldo só sai quando a sessão fecha.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-ink text-txt font-body antialiased">
        <Providers>
          <div className="relative min-h-screen">
            <div className="pointer-events-none fixed inset-0 z-0 arena-grid" aria-hidden />
            <div className="relative z-10 flex min-h-screen flex-col">
              <Ticker />
              <Nav />
              <main className="flex-1">{children}</main>
              <footer className="border-t border-line/60 px-5 py-8 text-center text-xs text-txt-faint">
                <p className="font-mono">
                  OddOrEven &middot; provably fair &middot; commit-reveal on-chain &middot; comissão {1}% só no fecho da sessão
                </p>
                <p className="mt-2">Rede de testes — jogue apenas com ETH de teste. +18. Jogue com responsabilidade.</p>
              </footer>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
