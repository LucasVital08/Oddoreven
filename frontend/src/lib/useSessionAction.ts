"use client";

import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { SESSION_ABI } from "./contracts";

/**
 * Wraps a single session write: sends the tx, waits for the receipt, then runs
 * an optional onDone (e.g. refetch + clear local commit). Exposes granular state
 * so buttons can show "assinando…" vs "confirmando…".
 */
export function useSessionAction(session: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [phase, setPhase] = useState<"idle" | "signing" | "mining">("idle");
  const [error, setError] = useState<string | null>(null);

  async function run(
    functionName: string,
    args: unknown[] = [],
    value?: bigint,
    onDone?: () => void
  ) {
    if (!session) return;
    setError(null);
    setPhase("signing");
    try {
      const hash = await writeContractAsync({
        address: session,
        abi: SESSION_ABI,
        functionName,
        args,
        value,
      });
      setPhase("mining");
      await publicClient!.waitForTransactionReceipt({ hash });
      setPhase("idle");
      onDone?.();
    } catch (e: any) {
      setPhase("idle");
      setError(e?.shortMessage || e?.message || "Transação falhou.");
    }
  }

  return { run, phase, busy: phase !== "idle", error, setError };
}
