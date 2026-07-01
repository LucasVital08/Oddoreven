"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { CreateSessionForm } from "@/components/CreateSessionForm";
import { SessionCard } from "@/components/SessionCard";
import { LiveBadge } from "@/components/LiveBadge";
import { useAllSessions, useSessionsByPlayer } from "@/lib/hooks";

type Filter = "all" | "mine";

export default function Lobby() {
  const { address, isConnected } = useAccount();
  const { data: all, isLoading } = useAllSessions();
  const { data: mine } = useSessionsByPlayer(address);
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    const src = filter === "mine" ? mine ?? [] : all ?? [];
    return [...src].reverse(); // newest first
  }, [filter, all, mine]);

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <LiveBadge label="Lobby" />
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">Encontre um oponente</h1>
          <p className="mt-2 text-txt-dim">Entre numa sala aberta, assista a duelos ao vivo ou abra a sua.</p>
        </div>
        <div className="flex rounded-xl border border-line-2 bg-panel p-1">
          <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
            Todas
          </FilterBtn>
          <FilterBtn active={filter === "mine"} onClick={() => setFilter("mine")} disabled={!isConnected}>
            Minhas salas
          </FilterBtn>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CreateSessionForm />
        </aside>

        <section>
          {isLoading && <SkeletonGrid />}
          {!isLoading && list.length === 0 && (
            <div className="card grid place-items-center px-6 py-20 text-center">
              <div className="font-display text-2xl font-bold text-txt-dim">Nenhuma sala por aqui</div>
              <p className="mt-2 max-w-sm text-sm text-txt-faint">
                {filter === "mine"
                  ? "Você ainda não participa de nenhuma disputa. Abra uma sala ao lado."
                  : "Seja o primeiro a abrir uma sala e travar ETH na arena."}
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {list.map((addr, i) => (
              <SessionCard key={addr} address={addr} index={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FilterBtn({
  children,
  active,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
        active ? "bg-even text-[#04120c]" : "text-txt-dim hover:text-txt"
      }`}
    >
      {children}
    </button>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card relative h-48 overflow-hidden p-5">
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
      ))}
    </div>
  );
}
