"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAddress, parseEther, decodeEventLog } from "viem";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { FACTORY_ABI, FACTORY_ADDRESS } from "@/lib/contracts";
import { LiveBadge } from "./LiveBadge";

export function CreateSessionForm() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();

  const [opponent, setOpponent] = useState("");
  const [deposit, setDeposit] = useState("0.05");
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const busy = isPending || confirming;

  async function onCreate() {
    setErr(null);
    if (!isAddress(opponent)) return setErr("Endereço do oponente inválido.");
    const amt = Number(deposit);
    if (!amt || amt <= 0) return setErr("O depósito precisa ser maior que zero.");

    try {
      const hash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "createSession",
        args: [opponent as `0x${string}`],
        value: parseEther(deposit),
      });
      setConfirming(true);
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      // Pull the new session address out of the SessionCreated event
      let sessionAddr: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = decodeEventLog({ abi: FACTORY_ABI, data: log.data, topics: log.topics });
          if (parsed.eventName === "SessionCreated") {
            sessionAddr = (parsed.args as any).sessionAddress as string;
            break;
          }
        } catch {
          /* not our event */
        }
      }
      setConfirming(false);
      if (sessionAddr) router.push(`/play/${sessionAddr}`);
    } catch (e: any) {
      setConfirming(false);
      setErr(e?.shortMessage || e?.message || "Falha ao criar a sala.");
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/60 px-5 py-4">
        <div>
          <div className="eyebrow">Nova disputa</div>
          <h3 className="mt-1 font-display text-lg font-bold">Abra uma sala e desafie</h3>
        </div>
        <LiveBadge label="1v1" tone="gold" />
      </div>

      <div className="space-y-4 p-5">
        <label className="block">
          <span className="eyebrow">Carteira do oponente</span>
          <input
            value={opponent}
            onChange={(e) => setOpponent(e.target.value.trim())}
            placeholder="0x…"
            spellCheck={false}
            className="mt-1.5 w-full rounded-xl border border-line-2 bg-panel-2 px-4 py-3 font-mono text-sm text-txt outline-none transition-colors placeholder:text-txt-faint focus:border-even"
          />
        </label>

        <label className="block">
          <span className="eyebrow">Seu depósito inicial (ETH)</span>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              className="w-full rounded-xl border border-line-2 bg-panel-2 px-4 py-3 font-mono text-lg font-bold text-gold outline-none focus:border-gold num"
            />
            <div className="flex gap-1">
              {["0.05", "0.1", "0.5", "1"].map((v) => (
                <button
                  key={v}
                  onClick={() => setDeposit(v)}
                  className="rounded-lg border border-line-2 px-2.5 py-1 font-mono text-xs text-txt-dim transition-colors hover:border-gold hover:text-gold"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </label>

        {err && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{err}</div>
        )}

        <button onClick={onCreate} disabled={!isConnected || busy} className="btn-primary w-full">
          {!isConnected ? "Conecte a carteira" : busy ? "Criando sala…" : "Criar sala & travar ETH ▸"}
        </button>
        <p className="text-center text-xs text-txt-faint">
          O oponente precisa aceitar entrando na sala com o próprio depósito.
        </p>
      </div>
    </div>
  );
}
