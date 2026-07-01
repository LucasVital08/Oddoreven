import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * A commit-reveal secret must survive page reloads between startRound() and
 * revealRound(), so we persist it in localStorage keyed by session address.
 */
export interface Commit {
  keygame: string; // 64-char hex, no 0x
  option: number; // the proposer's secret number
  isOdd: boolean;
  bet: string; // wei as string
  createdAt: number;
}

interface CommitState {
  commits: Record<string, Commit>; // key: sessionAddress (lowercase)
  saveCommit: (session: string, commit: Commit) => void;
  getCommit: (session: string) => Commit | undefined;
  clearCommit: (session: string) => void;
}

export const useCommitStore = create<CommitState>()(
  persist(
    (set, get) => ({
      commits: {},
      saveCommit: (session, commit) =>
        set((s) => ({ commits: { ...s.commits, [session.toLowerCase()]: commit } })),
      getCommit: (session) => get().commits[session.toLowerCase()],
      clearCommit: (session) =>
        set((s) => {
          const next = { ...s.commits };
          delete next[session.toLowerCase()];
          return { commits: next };
        }),
    }),
    { name: "oddoreven-commits" }
  )
);
