"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LiveBadge } from "@/components/LiveBadge";

const FLOW = [
  {
    n: "01",
    t: "Abra a sala e trave ETH",
    d: "Você deposita ETH e informa a carteira do rival. O contrato OddOrEvenSession guarda o valor — nem você, nem a casa consegue sacar no meio do jogo.",
    tone: "even",
  },
  {
    n: "02",
    t: "O rival entra e cobre",
    d: "O oponente aceita o desafio depositando o próprio ETH. Agora os dois têm saldo interno na sala e a disputa começa.",
    tone: "odd",
  },
  {
    n: "03",
    t: "Qualquer um propõe uma rodada",
    d: "Quem propõe escolhe PAR ou ÍMPAR e um número secreto. Só o hash keccak256 do número vai pra blockchain — a jogada fica escondida (commit).",
    tone: "even",
  },
  {
    n: "04",
    t: "O outro aceita e joga aberto",
    d: "O rival escolhe o número dele, à vista. Se a soma dos dois números tiver a paridade apostada pelo proponente, o proponente ganha a rodada.",
    tone: "odd",
  },
  {
    n: "05",
    t: "Revele e mova o saldo",
    d: "O proponente revela número + chave. O contrato recalcula o hash — se bater, vale. O valor da aposta passa de um saldo interno pro outro. Revanche imediata.",
    tone: "even",
  },
  {
    n: "06",
    t: "Encerre quando quiser",
    d: "Qualquer jogador fecha a sessão. O contrato aplica 1% de comissão sobre o pote total e devolve o restante às carteiras, proporcional ao saldo de cada um.",
    tone: "gold",
  },
];

export default function How() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <div className="text-center">
        <LiveBadge label="Provably fair" />
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight md:text-5xl">Como funciona</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-txt-dim">
          Um esquema <strong className="text-txt">commit-reveal</strong> garante que ninguém pode trapacear:
          você se compromete com sua jogada <em className="not-italic text-even">antes</em> de ver a do adversário.
        </p>
      </div>

      <div className="mt-12 space-y-4">
        {FLOW.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="card flex gap-5 p-6"
          >
            <div
              className={`stat-num shrink-0 text-3xl ${
                s.tone === "even" ? "text-even" : s.tone === "odd" ? "text-odd" : "gold-text"
              }`}
            >
              {s.n}
            </div>
            <div>
              <h3 className="font-display text-xl font-bold">{s.t}</h3>
              <p className="mt-2 leading-relaxed text-txt-dim">{s.d}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Safe t="Anti-trapaça" d="Timeout de 20 min: se o proponente some sem revelar, o rival reivindica a vitória." />
        <Safe t="Sem confiança na casa" d="A comissão é código no contrato — 1%, só no fecho, sobre o pote. Nada por rodada." />
        <Safe t="Custódia é o contrato" d="Seu ETH fica no OddOrEvenSession até o encerramento. Ninguém saca antes." />
      </div>

      <div className="mt-12 text-center">
        <Link href="/lobby" className="btn-primary text-base">
          Entrar na arena ▸
        </Link>
      </div>
    </div>
  );
}

function Safe({ t, d }: { t: string; d: string }) {
  return (
    <div className="card p-5">
      <h4 className="font-display font-bold text-even">{t}</h4>
      <p className="mt-2 text-sm leading-relaxed text-txt-dim">{d}</p>
    </div>
  );
}
