"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatEther, isAddress, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useSession, type SessionData } from "@/lib/hooks";
import { useSessionAction } from "@/lib/useSessionAction";
import { useCommitStore } from "@/store/useCommitStore";
import { RoundState, TIMEOUT_SECONDS, COMMISSION_PERCENT } from "@/lib/contracts";
import { generateKeygame, buildCommitHash, keygameToBytes, proposerWins } from "@/lib/hash";
import { fmtEth, shortAddr } from "@/lib/format";
import { Identicon } from "@/components/Identicon";
import { LiveBadge } from "@/components/LiveBadge";
import { CountUp } from "@/components/CountUp";
import { CountdownRing } from "@/components/Countdown";
import { SideToggle, NumberPicker } from "@/components/game/Pickers";

export default function PlayRoom() {
  const params = useParams();
  const address = (params.address as string)?.toLowerCase() as `0x${string}`;
  const valid = isAddress(address);
  const { address: me } = useAccount();
  const { session, refetch } = useSession(valid ? address : undefined);

  if (!valid) {
    return <Center>Endereço de sala inválido.</Center>;
  }
  if (!session) {
    return <Center>Carregando sala…</Center>;
  }

  const role =
    me?.toLowerCase() === session.player1.toLowerCase()
      ? "p1"
      : me?.toLowerCase() === session.player2.toLowerCase()
        ? "p2"
        : "spectator";

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <Link href="/lobby" className="mb-5 inline-block text-sm text-txt-dim hover:text-even">
        ◂ Voltar ao lobby
      </Link>

      <RoomHeader session={session} address={address} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Arena session={session} address={address} role={role} refetch={refetch} />
        <div className="space-y-6">
          <SessionControls session={session} address={address} role={role} refetch={refetch} />
          <RoundHistory session={session} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Header ─────────────────────────── */

function RoomHeader({ session, address }: { session: SessionData; address: `0x${string}` }) {
  const pot = session.balance1 + session.balance2;
  const live = session.player2Joined && !session.sessionClosed;
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-txt-faint">SALA {shortAddr(address, 5)}</span>
          {session.sessionClosed ? (
            <span className="chip !text-txt-faint">Encerrada</span>
          ) : live ? (
            <LiveBadge label="Sala ativa" />
          ) : (
            <span className="chip !text-gold">Aguardando oponente</span>
          )}
        </div>
        <div className="text-right">
          <div className="eyebrow">Pote total travado</div>
          <div className="stat-num text-2xl gold-text">
            <CountUp value={Number(formatEther(pot))} decimals={4} suffix=" Ξ" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x divide-line/60">
        <PlayerPanel address={session.player1} balance={session.balance1} label="Player 1" side="even" />
        <PlayerPanel address={session.player2} balance={session.balance2} label="Player 2" side="odd" joined={session.player2Joined} />
      </div>
    </div>
  );
}

function PlayerPanel({
  address,
  balance,
  label,
  side,
  joined = true,
}: {
  address: `0x${string}`;
  balance: bigint;
  label: string;
  side: "even" | "odd";
  joined?: boolean;
}) {
  const color = side === "even" ? "text-even" : "text-odd";
  return (
    <div className="flex items-center gap-4 p-5">
      <Identicon address={address} size={52} />
      <div className="min-w-0 flex-1">
        <div className={`eyebrow ${color}`}>{label}</div>
        <Link href={`/profile/${address}`} className="block truncate font-mono text-sm text-txt hover:underline">
          {shortAddr(address, 5)}
        </Link>
        <div className="mt-1 stat-num text-lg">
          <CountUp value={Number(formatEther(balance))} decimals={4} suffix=" Ξ" />
          {!joined && <span className="ml-2 font-body text-xs font-normal text-gold">ainda não entrou</span>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Arena (state machine) ─────────────────────────── */

function Arena({
  session,
  address,
  role,
  refetch,
}: {
  session: SessionData;
  address: `0x${string}`;
  role: "p1" | "p2" | "spectator";
  refetch: () => void;
}) {
  const { run, busy, phase, error } = useSessionAction(address);
  const cr = session.currentRound;

  // Detect a freshly-decided round to flash the result
  const [flash, setFlash] = useState<{ winner: string } | null>(null);
  const lastLen = useRef(session.history.length);
  useEffect(() => {
    if (session.history.length > lastLen.current) {
      const last = session.history[session.history.length - 1];
      setFlash({ winner: last.winner });
      const t = setTimeout(() => setFlash(null), 3200);
      return () => clearTimeout(t);
    }
    lastLen.current = session.history.length;
  }, [session.history]);

  const canPlay = role !== "spectator" && session.player2Joined && !session.sessionClosed;

  let body: React.ReactNode;
  if (session.sessionClosed) {
    body = <ClosedView />;
  } else if (!session.player2Joined) {
    body = <JoinView session={session} role={role} run={run} busy={busy} phase={phase} refetch={refetch} />;
  } else if (cr.state === RoundState.IDLE) {
    body = canPlay ? (
      <ProposeView session={session} address={address} run={run} busy={busy} phase={phase} refetch={refetch} />
    ) : (
      <SpectatorIdle />
    );
  } else if (cr.state === RoundState.COMMITTED) {
    body = <CommittedView session={session} role={role} run={run} busy={busy} phase={phase} refetch={refetch} />;
  } else {
    body = <AcceptedView session={session} address={address} role={role} run={run} busy={busy} phase={phase} refetch={refetch} />;
  }

  return (
    <div className="card relative min-h-[440px] overflow-hidden p-6">
      <AnimatePresence>{flash && <ResultFlash winner={flash.winner} session={session} />}</AnimatePresence>
      {body}
      {error && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
      )}
    </div>
  );
}

/* ── Join ── */
function JoinView({ session, role, run, busy, phase, refetch }: any) {
  const [dep, setDep] = useState(formatEther(session.balance1)); // suggest matching stake
  if (role === "p2") {
    return (
      <ArenaShell title="Você foi desafiado!" sub="Cubra a aposta entrando na sala com seu depósito.">
        <div className="mx-auto max-w-sm">
          <label className="eyebrow">Seu depósito (ETH)</label>
          <input
            type="number"
            value={dep}
            min="0"
            step="0.01"
            onChange={(e) => setDep(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-line-2 bg-panel-2 px-4 py-3 text-center font-mono text-2xl font-bold text-gold outline-none focus:border-gold num"
          />
          <button
            onClick={() => run("joinSession", [], parseEther(dep || "0"), refetch)}
            disabled={busy}
            className="btn-primary mt-4 w-full"
          >
            {busy ? phaseLabel(phase) : "Aceitar desafio & entrar ▸"}
          </button>
        </div>
      </ArenaShell>
    );
  }
  return (
    <ArenaShell title="Aguardando o oponente" sub={`Convide ${shortAddr(session.player2, 4)} para entrar na sala.`}>
      <div className="animate-pulse-dot text-6xl">⏳</div>
    </ArenaShell>
  );
}

/* ── Propose ── */
function ProposeView({ session, address, run, busy, phase, refetch }: any) {
  const saveCommit = useCommitStore((s) => s.saveCommit);
  const [isOdd, setIsOdd] = useState(false);
  const [num, setNum] = useState(3);
  const maxBet = session.balance1 < session.balance2 ? session.balance1 : session.balance2;
  const [bet, setBet] = useState("0.01");

  async function propose() {
    const keygame = generateKeygame();
    const hash = buildCommitHash(keygame, num);
    const betWei = parseEther(bet || "0");
    saveCommit(address, { keygame, option: num, isOdd, bet: betWei.toString(), createdAt: Date.now() });
    run("startRound", [isOdd, hash, betWei], undefined, refetch);
  }

  const betWei = (() => {
    try {
      return parseEther(bet || "0");
    } catch {
      return 0n;
    }
  })();
  const betInvalid = betWei <= 0n || betWei > maxBet;

  return (
    <ArenaShell title="Sua vez de propor" sub="Escolha lado + número secreto. Só o hash vai pra chain — ninguém vê sua jogada.">
      <div className="mx-auto max-w-md space-y-5 text-left">
        <div>
          <div className="eyebrow mb-2">Você aposta que a soma será</div>
          <SideToggle isOdd={isOdd} onChange={setIsOdd} />
        </div>
        <div>
          <div className="eyebrow mb-2">Seu número secreto</div>
          <NumberPicker value={num} onChange={setNum} tone={isOdd ? "odd" : "even"} />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">Valor da rodada</span>
            <button onClick={() => setBet(formatEther(maxBet))} className="font-mono text-xs text-gold hover:underline">
              máx {fmtEth(maxBet)}
            </button>
          </div>
          <input
            type="number"
            value={bet}
            min="0"
            step="0.005"
            onChange={(e) => setBet(e.target.value)}
            className={`w-full rounded-xl border-2 bg-panel-2 px-4 py-3 font-mono text-xl font-bold outline-none num ${
              betInvalid ? "border-danger/60 text-danger" : "border-line-2 text-gold focus:border-gold"
            }`}
          />
          {betWei > maxBet && <p className="mt-1 text-xs text-danger">Acima do saldo disponível dos dois lados.</p>}
        </div>
        <button onClick={propose} disabled={busy || betInvalid} className="btn-primary w-full text-base">
          {busy ? phaseLabel(phase) : "Comprometer jogada ▸"}
        </button>
        <p className="text-center text-xs text-txt-faint">
          🔒 Seu número e a chave ficam salvos neste navegador até você revelar.
        </p>
      </div>
    </ArenaShell>
  );
}

/* ── Committed (waiting for accept / accept form) ── */
function CommittedView({ session, role, run, busy, phase, refetch }: any) {
  const cr = session.currentRound;
  const iAmProposer = proposerRole(session, role) === "proposer";
  const [num, setNum] = useState(2);
  const timeoutAt = Number(cr.startTime) + TIMEOUT_SECONDS;

  if (iAmProposer) {
    return (
      <ArenaShell
        title="Proposta na mesa"
        sub={`Você apostou ${cr.isOdd ? "ÍMPAR" : "PAR"} valendo ${fmtEth(cr.bet)}. Aguardando o rival aceitar.`}
      >
        <div className="flex flex-col items-center gap-4">
          <CommitBadge isOdd={cr.isOdd} bet={cr.bet} />
          <div className="flex items-center gap-3 text-sm text-txt-dim">
            <span>Expira em</span>
            <CountdownRing targetTs={timeoutAt} totalSeconds={TIMEOUT_SECONDS} tone="gold" />
          </div>
          <button onClick={() => run("cancelRoundByTimeout", [], undefined, refetch)} disabled={busy} className="btn-ghost">
            {busy ? phaseLabel(phase) : "Cancelar por timeout"}
          </button>
        </div>
      </ArenaShell>
    );
  }

  if (role === "spectator") {
    return <ArenaShell title="Rodada proposta" sub="Aguardando o oponente aceitar a aposta."><CommitBadge isOdd={cr.isOdd} bet={cr.bet} /></ArenaShell>;
  }

  // I'm the acceptor
  return (
    <ArenaShell title="Você foi desafiado nesta rodada" sub={`O rival apostou ${cr.isOdd ? "ÍMPAR" : "PAR"} valendo ${fmtEth(cr.bet)}. Escolha seu número e cubra.`}>
      <div className="mx-auto max-w-md space-y-5">
        <CommitBadge isOdd={cr.isOdd} bet={cr.bet} />
        <div>
          <div className="eyebrow mb-2">Seu número (visível ao revelar)</div>
          <NumberPicker value={num} onChange={setNum} tone={cr.isOdd ? "even" : "odd"} />
        </div>
        <div className="flex gap-3">
          <button onClick={() => run("acceptRound", [num], undefined, refetch)} disabled={busy} className="btn-primary flex-1">
            {busy ? phaseLabel(phase) : "Aceitar & cobrir ▸"}
          </button>
          <button onClick={() => run("rejectRound", [], undefined, refetch)} disabled={busy} className="btn-danger">
            Recusar
          </button>
        </div>
      </div>
    </ArenaShell>
  );
}

/* ── Accepted (reveal / wait) ── */
function AcceptedView({ session, address, role, run, busy, phase, refetch }: any) {
  const cr = session.currentRound;
  const clearCommit = useCommitStore((s) => s.clearCommit);
  const commit = useCommitStore((s) => s.getCommit(address));
  const iAmProposer = proposerRole(session, role) === "proposer";
  const claimAt = Number(cr.acceptTime) + 2 * TIMEOUT_SECONDS;

  if (iAmProposer) {
    const canReveal = !!commit;
    const predicted = commit ? proposerWins(cr.isOdd, commit.option, cr.optionAcceptor) : null;
    return (
      <ArenaShell title="Hora de revelar!" sub="O rival já jogou. Abra seu número secreto para o contrato decidir.">
        <div className="mx-auto max-w-md space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <MiniCell label="Seu lado" value={cr.isOdd ? "ÍMPAR" : "PAR"} tone={cr.isOdd ? "odd" : "even"} />
            <MiniCell label="Nº do rival" value={String(cr.optionAcceptor)} />
          </div>
          {canReveal ? (
            <>
              {predicted !== null && (
                <div className={`rounded-lg px-3 py-2 text-center text-sm font-semibold ${predicted ? "bg-even/10 text-even" : "bg-odd/10 text-odd"}`}>
                  {predicted ? "Sua jogada vence esta rodada ✦" : "Esta rodada vai pro rival — revele para registrar"}
                </div>
              )}
              <button
                onClick={() => run("revealRound", [keygameToBytes(commit!.keygame), commit!.option], undefined, () => { clearCommit(address); refetch(); })}
                disabled={busy}
                className="btn-primary w-full text-base"
              >
                {busy ? phaseLabel(phase) : `Revelar número ${commit!.option} ▸`}
              </button>
            </>
          ) : (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-3 text-sm text-danger">
              Segredo desta rodada não encontrado neste navegador — não é possível revelar aqui. O rival poderá reivindicar por timeout.
            </div>
          )}
        </div>
      </ArenaShell>
    );
  }

  // I'm the acceptor waiting for reveal
  return (
    <ArenaShell title="Aguardando revelação" sub="O proponente precisa abrir o número. Se travar, reivindique por timeout.">
      <div className="flex flex-col items-center gap-4">
        <MiniCell label="Seu número" value={String(cr.optionAcceptor)} />
        <div className="flex items-center gap-3 text-sm text-txt-dim">
          <span>Reivindicável em</span>
          <CountdownRing targetTs={claimAt} totalSeconds={2 * TIMEOUT_SECONDS} tone="odd" />
        </div>
        {role !== "spectator" && (
          <button onClick={() => run("claimRoundByTimeout", [], undefined, refetch)} disabled={busy} className="btn-ghost">
            {busy ? phaseLabel(phase) : "Reivindicar vitória por timeout"}
          </button>
        )}
      </div>
    </ArenaShell>
  );
}

/* ─────────────────────────── Side controls ─────────────────────────── */

function SessionControls({ session, address, role, refetch }: any) {
  const { run, busy, phase, error } = useSessionAction(address);
  const [top, setTop] = useState("0.05");
  const idle = session.currentRound.state === RoundState.IDLE;

  if (session.sessionClosed) {
    return (
      <div className="card p-5 text-center">
        <div className="eyebrow">Sessão</div>
        <div className="mt-2 font-display text-xl font-bold text-txt-dim">Encerrada & liquidada</div>
        <p className="mt-2 text-sm text-txt-faint">Os saldos finais foram enviados às carteiras (menos {COMMISSION_PERCENT}% de comissão).</p>
      </div>
    );
  }

  if (role === "spectator") {
    return (
      <div className="card p-5 text-center text-sm text-txt-dim">
        Você está assistindo esta sala. Conecte-se como um dos jogadores para participar.
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="eyebrow">Gerenciar sala</div>

      {session.player2Joined && (
        <div>
          <label className="mb-1.5 block text-xs text-txt-dim">Adicionar saldo (top-up)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={top}
              min="0"
              step="0.01"
              onChange={(e) => setTop(e.target.value)}
              className="w-full rounded-lg border border-line-2 bg-panel-2 px-3 py-2 font-mono text-sm text-txt outline-none focus:border-even num"
            />
            <button onClick={() => run("topUp", [], parseEther(top || "0"), refetch)} disabled={busy} className="btn-ghost !px-4 !py-2 text-sm">
              +ETH
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-line/60 pt-4">
        <button
          onClick={() => run("closeSession", [], undefined, refetch)}
          disabled={busy || !idle}
          className="btn-danger w-full"
          title={!idle ? "Finalize a rodada em andamento primeiro" : undefined}
        >
          {busy ? phaseLabel(phase) : "Encerrar sessão & sacar"}
        </button>
        <p className="mt-2 text-center text-xs text-txt-faint">
          {idle ? `Libera os saldos às carteiras. Comissão de ${COMMISSION_PERCENT}% aplicada ao pote.` : "Há uma rodada em andamento."}
        </p>
      </div>
      {error && <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
    </div>
  );
}

/* ─────────────────────────── History ─────────────────────────── */

function RoundHistory({ session }: { session: SessionData }) {
  const wins1 = session.history.filter((r) => r.winner.toLowerCase() === session.player1.toLowerCase()).length;
  const wins2 = session.history.length - wins1;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/60 px-5 py-3">
        <span className="eyebrow">Histórico de rodadas</span>
        <span className="font-mono text-xs text-txt-dim num">
          <span className="text-even">{wins1}</span> — <span className="text-odd">{wins2}</span>
        </span>
      </div>
      {session.history.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-txt-faint">Nenhuma rodada jogada ainda.</div>
      ) : (
        <ol className="max-h-72 divide-y divide-line/60 overflow-y-auto">
          {[...session.history].reverse().map((r, i) => {
            const p1won = r.winner.toLowerCase() === session.player1.toLowerCase();
            return (
              <li key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-mono text-xs text-txt-faint">#{session.history.length - i}</span>
                <span className={`font-semibold ${p1won ? "text-even" : "text-odd"}`}>
                  {p1won ? "Player 1" : "Player 2"} {r.byTimeout && <span className="text-txt-faint">(timeout)</span>}
                </span>
                <span className="font-mono num text-gold">+{fmtEth(r.bet)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ─────────────────────────── Small pieces ─────────────────────────── */

function ArenaShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[380px] flex-col">
      <div className="mb-6 text-center">
        <h2 className="font-display text-2xl font-extrabold tracking-tight">{title}</h2>
        {sub && <p className="mx-auto mt-2 max-w-md text-sm text-txt-dim">{sub}</p>}
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </motion.div>
  );
}

function CommitBadge({ isOdd, bet }: { isOdd: boolean; bet: bigint }) {
  return (
    <div className={`mx-auto flex w-fit items-center gap-4 rounded-2xl border-2 px-6 py-4 ${isOdd ? "border-odd/50 bg-odd/5" : "border-even/50 bg-even/5"}`}>
      <div className="text-center">
        <div className="eyebrow">Aposta</div>
        <div className={`font-display text-2xl font-extrabold ${isOdd ? "text-odd" : "text-even"}`}>{isOdd ? "ÍMPAR" : "PAR"}</div>
      </div>
      <div className="h-10 w-px bg-line-2" />
      <div className="text-center">
        <div className="eyebrow">Valor</div>
        <div className="stat-num text-2xl gold-text">{fmtEth(bet)}</div>
      </div>
    </div>
  );
}

function MiniCell({ label, value, tone }: { label: string; value: string; tone?: "even" | "odd" }) {
  const c = tone === "even" ? "text-even" : tone === "odd" ? "text-odd" : "text-txt";
  return (
    <div className="rounded-xl border border-line-2 bg-panel-2 px-4 py-3 text-center">
      <div className="eyebrow">{label}</div>
      <div className={`stat-num mt-1 text-2xl ${c}`}>{value}</div>
    </div>
  );
}

function ResultFlash({ winner, session }: { winner: string; session: SessionData }) {
  const p1 = winner.toLowerCase() === session.player1.toLowerCase();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="absolute inset-0 z-20 grid place-items-center bg-ink/85 backdrop-blur-sm"
    >
      <div className="text-center">
        <motion.div
          initial={{ rotate: -8, y: 10 }}
          animate={{ rotate: 0, y: 0 }}
          className={`font-display text-6xl font-extrabold ${p1 ? "text-even" : "text-odd"}`}
          style={{ textShadow: `0 0 40px ${p1 ? "rgba(0,230,168,.6)" : "rgba(255,61,113,.6)"}` }}
        >
          {p1 ? "PLAYER 1" : "PLAYER 2"}
        </motion.div>
        <div className="mt-2 font-mono text-sm uppercase tracking-[0.3em] text-txt-dim">venceu a rodada</div>
      </div>
    </motion.div>
  );
}

function ClosedView() {
  return (
    <ArenaShell title="Sessão encerrada" sub="Os saldos finais foram liquidados nas carteiras. Obrigado por jogar!">
      <div className="text-center text-6xl">🏁</div>
    </ArenaShell>
  );
}

function SpectatorIdle() {
  return <ArenaShell title="Sala em espera" sub="Aguardando um dos jogadores propor a próxima rodada." ><div className="text-center text-5xl opacity-60">🎲</div></ArenaShell>;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-[50vh] place-items-center px-5 text-txt-dim">{children}</div>;
}

/* helpers */
function proposerRole(session: SessionData, role: "p1" | "p2" | "spectator") {
  const proposer = session.currentRound.proposer.toLowerCase();
  const meAddr = role === "p1" ? session.player1.toLowerCase() : role === "p2" ? session.player2.toLowerCase() : "";
  return meAddr && meAddr === proposer ? "proposer" : "acceptor";
}

function phaseLabel(phase: "idle" | "signing" | "mining") {
  return phase === "signing" ? "Assine na carteira…" : phase === "mining" ? "Confirmando…" : "…";
}
