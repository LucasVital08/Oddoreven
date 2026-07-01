"use client";

import { useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ABI, FACTORY_ADDRESS, SESSION_ABI } from "./contracts";

export interface CurrentRound {
  proposer: `0x${string}`;
  hashOption: `0x${string}`;
  isOdd: boolean;
  bet: bigint;
  state: number;
  optionAcceptor: number;
  startTime: bigint;
  acceptTime: bigint;
}

export interface RoundRecord {
  winner: `0x${string}`;
  bet: bigint;
  optionProposer: number;
  optionAcceptor: number;
  byTimeout: boolean;
  timestamp: bigint;
}

export interface SessionData {
  player1: `0x${string}`;
  player2: `0x${string}`;
  platformOwner: `0x${string}`;
  balance1: bigint;
  balance2: bigint;
  sessionClosed: boolean;
  player2Joined: boolean;
  currentRound: CurrentRound;
  history: RoundRecord[];
}

/** All session addresses ever created by the factory. */
export function useAllSessions() {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getAllSessions",
    query: { refetchInterval: 5000 },
  }) as { data: `0x${string}`[] | undefined; isLoading: boolean; refetch: () => void };
}

/** Sessions that involve a given player. */
export function useSessionsByPlayer(player?: `0x${string}`) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getSessionsByPlayer",
    args: player ? [player] : undefined,
    query: { enabled: !!player, refetchInterval: 5000 },
  }) as { data: `0x${string}`[] | undefined; isLoading: boolean };
}

const base = (address: `0x${string}`) => ({ address, abi: SESSION_ABI }) as const;

/** Full state of a single session, batched into one multicall and polled live. */
export function useSession(address?: `0x${string}`) {
  const enabled = !!address;
  const { data, isLoading, refetch } = useReadContracts({
    contracts: enabled
      ? [
          { ...base(address!), functionName: "player1" },
          { ...base(address!), functionName: "player2" },
          { ...base(address!), functionName: "platformOwner" },
          { ...base(address!), functionName: "balance1" },
          { ...base(address!), functionName: "balance2" },
          { ...base(address!), functionName: "sessionClosed" },
          { ...base(address!), functionName: "player2Joined" },
          { ...base(address!), functionName: "currentRound" },
          { ...base(address!), functionName: "getRoundHistory" },
        ]
      : [],
    query: { enabled, refetchInterval: 4000 },
  });

  let session: SessionData | undefined;
  if (data && data.length >= 9 && data.every((d) => d.status === "success")) {
    const r = data as unknown as { result: unknown }[];
    const cr = r[7].result as unknown[];
    const hist = (r[8].result as unknown[]) ?? [];
    session = {
      player1: r[0].result as `0x${string}`,
      player2: r[1].result as `0x${string}`,
      platformOwner: r[2].result as `0x${string}`,
      balance1: r[3].result as bigint,
      balance2: r[4].result as bigint,
      sessionClosed: r[5].result as boolean,
      player2Joined: r[6].result as boolean,
      currentRound: {
        proposer: cr[0] as `0x${string}`,
        hashOption: cr[1] as `0x${string}`,
        isOdd: cr[2] as boolean,
        bet: cr[3] as bigint,
        state: Number(cr[4]),
        optionAcceptor: Number(cr[5]),
        startTime: cr[6] as bigint,
        acceptTime: cr[7] as bigint,
      },
      history: hist.map((r: any) => ({
        winner: r.winner as `0x${string}`,
        bet: r.bet as bigint,
        optionProposer: Number(r.optionProposer),
        optionAcceptor: Number(r.optionAcceptor),
        byTimeout: r.byTimeout as boolean,
        timestamp: r.timestamp as bigint,
      })),
    };
  }

  return { session, isLoading, refetch };
}
