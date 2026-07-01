"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { useSession } from "@/lib/hooks";
import { fmtEth, shortAddr } from "@/lib/format";
import { Identicon } from "./Identicon";
import { LiveBadge } from "./LiveBadge";

function statusOf(s: ReturnType<typeof useSession>["session"]) {
  if (!s) return { label: "Carregando", tone: "text-txt-dim", live: false };
  if (s.sessionClosed) return { label: "Encerrada", tone: "text-txt-faint", live: false };
  if (!s.player2Joined) return { label: "Aguardando oponente", tone: "text-gold", live: false };
  if (s.currentRound.state > 0) return { label: "Rodada ao vivo", tone: "text-odd", live: true };
  return { label: "Sala ativa", tone: "text-even", live: true };
}

export function SessionCard({ address, index }: { address: `0x${string}`; index: number }) {
  const { session } = useSession(address);
  const { address: me } = useAccount();
  const st = statusOf(session);
  const pot = session ? session.balance1 + session.balance2 : 0n;
  const mine =
    me && session && (me.toLowerCase() === session.player1.toLowerCase() || me.toLowerCase() === session.player2.toLowerCase());
  const canJoin = me && session && !session.player2Joined && me.toLowerCase() === session.player2.toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/play/${address}`} className="group block">
        <div className="card relative overflow-hidden p-5 transition-all duration-200 hover:border-even/50 hover:shadow-panel">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[11px] text-txt-faint">SALA #{shortAddr(address, 3)}</span>
            {st.live ? <LiveBadge label={st.label} tone={session?.currentRound.state ? "odd" : "even"} /> : (
              <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${st.tone}`}>{st.label}</span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <PlayerMini address={session?.player1} label="Player 1" />
            <div className="flex flex-col items-center">
              <span className="font-display text-lg font-extrabold text-txt-faint">VS</span>
            </div>
            <PlayerMini address={session?.player2} label="Player 2" align="right" />
          </div>

          <div className="mt-5 flex items-end justify-between border-t border-line/60 pt-4">
            <div>
              <div className="eyebrow">Em jogo</div>
              <div className="stat-num mt-1 text-xl gold-text">{fmtEth(pot)}</div>
            </div>
            <span className="btn-ghost !px-4 !py-2 text-xs group-hover:border-even group-hover:text-even">
              {canJoin ? "Entrar ▸" : mine ? "Abrir sala ▸" : "Assistir ▸"}
            </span>
          </div>

          {mine && (
            <span className="absolute right-0 top-0 rounded-bl-lg bg-even/15 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-even">
              você
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function PlayerMini({ address, label, align = "left" }: { address?: string; label: string; align?: "left" | "right" }) {
  return (
    <div className={`flex flex-1 items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <Identicon address={address} size={36} />
      <div className={align === "right" ? "text-right" : ""}>
        <div className="eyebrow">{label}</div>
        <div className="font-mono text-xs text-txt">{shortAddr(address, 3)}</div>
      </div>
    </div>
  );
}
