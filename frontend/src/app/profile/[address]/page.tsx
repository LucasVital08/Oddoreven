"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { isAddress, formatEther } from "viem";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ABI, FACTORY_ADDRESS, SESSION_ABI } from "@/lib/contracts";
import { shortAddr } from "@/lib/format";
import { Identicon } from "@/components/Identicon";
import { StatTile } from "@/components/StatTile";
import { SessionCard } from "@/components/SessionCard";
import { LiveBadge } from "@/components/LiveBadge";

export default function Profile() {
  const params = useParams();
  const player = (params.address as string) as `0x${string}`;
  const valid = isAddress(player);
  const { address: me } = useAccount();
  const isMe = me?.toLowerCase() === player?.toLowerCase();

  const { data: sessions } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getSessionsByPlayer",
    args: valid ? [player] : undefined,
    query: { enabled: valid },
  }) as { data: `0x${string}`[] | undefined };

  const stats = usePlayerStats(valid ? player : undefined, sessions);

  if (!valid) return <div className="grid min-h-[50vh] place-items-center text-txt-dim">Endereço inválido.</div>;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Identity banner */}
      <div className="card relative overflow-hidden p-6 md:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-even/10 blur-3xl" />
        <div className="flex flex-wrap items-center gap-5">
          <Identicon address={player} size={84} />
          <div>
            {isMe && <LiveBadge label="Você" />}
            <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{shortAddr(player, 6)}</h1>
            <p className="font-mono text-xs text-txt-faint">{player}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="eyebrow">Resultado líquido (bruto)</div>
            <div className={`stat-num text-3xl ${stats.net >= 0 ? "text-even" : "text-odd"}`}>
              {stats.net >= 0 ? "+" : ""}
              {stats.net.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} Ξ
            </div>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Salas" value={sessions?.length ?? 0} tone="default" />
        <StatTile label="Rodadas" value={stats.played} sub={`${stats.won}V · ${stats.lost}D`} />
        <StatTile
          label="Taxa de vitória"
          value={`${stats.winRate}%`}
          tone={stats.winRate >= 50 ? "even" : "odd"}
        />
        <StatTile
          label="Volume apostado"
          value={`${stats.wagered.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} Ξ`}
          tone="gold"
        />
      </div>

      {/* Win/loss bar */}
      {stats.played > 0 && (
        <div className="mt-6 card p-5">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-even">{stats.won} vitórias</span>
            <span className="font-semibold text-odd">{stats.lost} derrotas</span>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-panel-3">
            <div className="bg-even" style={{ width: `${(stats.won / stats.played) * 100}%` }} />
            <div className="bg-odd" style={{ width: `${(stats.lost / stats.played) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Sessions */}
      <h2 className="mb-4 mt-10 font-display text-xl font-bold">Salas de {shortAddr(player, 4)}</h2>
      {!sessions || sessions.length === 0 ? (
        <div className="card px-6 py-12 text-center text-sm text-txt-faint">Nenhuma sala ainda.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...sessions].reverse().map((a, i) => (
            <SessionCard key={a} address={a} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Aggregate a player's round results across all their sessions. */
function usePlayerStats(player?: `0x${string}`, sessions?: `0x${string}`[]) {
  const { data } = useReadContracts({
    contracts: (sessions ?? []).map((s) => ({
      address: s,
      abi: SESSION_ABI,
      functionName: "getRoundHistory" as const,
    })),
    query: { enabled: !!player && !!sessions?.length },
  });

  return useMemo(() => {
    let won = 0,
      lost = 0,
      wagered = 0,
      net = 0;
    if (player && data) {
      for (const res of data) {
        if (res.status !== "success") continue;
        const hist = (res.result as any[]) ?? [];
        for (const r of hist) {
          const bet = Number(formatEther(r.bet as bigint));
          wagered += bet;
          if ((r.winner as string).toLowerCase() === player.toLowerCase()) {
            won++;
            net += bet;
          } else {
            lost++;
            net -= bet;
          }
        }
      }
    }
    const played = won + lost;
    const winRate = played ? Math.round((won / played) * 100) : 0;
    return { won, lost, played, wagered, net, winRate };
  }, [player, data]);
}
