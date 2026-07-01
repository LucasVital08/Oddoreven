"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CoinFlip } from "@/components/CoinFlip";
import { LiveBadge } from "@/components/LiveBadge";
import { CountUp } from "@/components/CountUp";
import { StatTile } from "@/components/StatTile";
import { useAllSessions, useSession } from "@/lib/hooks";

export default function Home() {
  const { isConnected } = useAccount();
  const { data: sessions } = useAllSessions();
  const total = sessions?.length ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-5">
      {/* HERO */}
      <section className="grid items-center gap-10 py-14 md:grid-cols-[1.15fr_0.85fr] md:py-20">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-3"
          >
            <LiveBadge label="Arena aberta" />
            <span className="chip">
              <span className="text-even">✓</span> provably fair · commit-reveal
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-balance font-display text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl"
          >
            Aposte no <span className="text-even">par</span>.
            <br />
            Domine o <span className="text-odd">ímpar</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-txt-dim"
          >
            Duelos 1v1 de par ou ímpar direto na blockchain. Trave seu ETH numa sala,
            desafie qualquer carteira e jogue <strong className="text-txt">quantas rodadas quiser</strong>.
            O saldo só volta pra carteira quando <em className="text-even not-italic">você</em> encerra a disputa.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link href="/lobby" className="btn-primary text-base">
              Entrar na arena ▸
            </Link>
            {!isConnected && <ConnectButton label="Conectar carteira" />}
            <Link href="/how" className="btn-ghost text-base">
              Como funciona
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-line/60 pt-6"
          >
            <FactStat k={String(total)} v="salas criadas" />
            <FactStat k="1%" v="comissão · só no fecho" />
            <FactStat k="∞" v="revanches por sala" />
            <FactStat k="20 min" v="timeout anti-trapaça" />
          </motion.div>
        </div>

        <div className="hidden md:block">
          <CoinFlip />
        </div>
      </section>

      {/* LIVE VOLUME BAND */}
      <LiveVolume sessions={sessions} />

      {/* HOW IT PLAYS */}
      <section className="py-16">
        <div className="mb-10 text-center">
          <div className="eyebrow">O fluxo da disputa</div>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">
            Rápido de entender. Impossível de fraudar.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="card p-5"
            >
              <div className="font-mono text-sm font-bold text-even">0{i + 1}</div>
              <h3 className="mt-3 font-display text-lg font-bold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-txt-dim">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAIRNESS / TRUST */}
      <section className="grid gap-4 pb-20 md:grid-cols-3">
        <StatTile label="Custódia" value="Smart contract" sub="Ninguém toca no ETH travado — nem a casa." tone="even" />
        <StatTile label="Aleatoriedade" value="Commit-Reveal" sub="Você compromete um hash antes de ver a jogada do rival." tone="odd" />
        <StatTile label="Comissão" value="1% no fecho" sub="Cobrada uma única vez, sobre o pote final da sala." tone="gold" />
      </section>
    </div>
  );
}

function FactStat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="stat-num text-2xl text-txt">{k}</div>
      <div className="text-xs text-txt-dim">{v}</div>
    </div>
  );
}

function LiveVolume({ sessions }: { sessions?: `0x${string}`[] }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <LiveBadge label="Volume ao vivo" tone="gold" />
          <span className="text-sm text-txt-dim">Somatório do ETH travado em todas as salas</span>
        </div>
        <Link href="/lobby" className="text-sm font-semibold text-even hover:underline">
          Ver todas as salas ▸
        </Link>
      </div>
      <div className="grid grid-cols-2 divide-line/60 md:grid-cols-4 md:divide-x">
        {(sessions ?? []).slice(0, 4).map((a) => (
          <VolumeCell key={a} address={a} />
        ))}
        {(!sessions || sessions.length === 0) && (
          <div className="col-span-full px-6 py-8 text-center text-sm text-txt-dim">
            Nenhuma sala ainda — <Link href="/lobby" className="text-even hover:underline">seja o primeiro a abrir uma</Link>.
          </div>
        )}
      </div>
    </section>
  );
}

function VolumeCell({ address }: { address: `0x${string}` }) {
  const { session } = useSession(address);
  const pot = session ? Number(formatEther(session.balance1 + session.balance2)) : 0;
  return (
    <div className="px-6 py-5">
      <div className="font-mono text-[11px] text-txt-faint">#{address.slice(2, 8)}</div>
      <div className="stat-num mt-1 text-xl gold-text">
        <CountUp value={pot} decimals={4} suffix=" Ξ" />
      </div>
    </div>
  );
}

const STEPS = [
  { t: "Abra a sala", d: "Deposite ETH e aponte a carteira do rival. O contrato cria a sala e trava o valor." },
  { t: "Proponha a rodada", d: "Qualquer um dos dois escolhe par/ímpar e um número secreto — só o hash vai pra chain." },
  { t: "Rival aceita", d: "O oponente cobre a aposta e revela o número dele. A tensão está no ar." },
  { t: "Revele & repita", d: "Você abre seu número, o contrato decide o vencedor e paga o saldo interno. Revanche na hora." },
];
