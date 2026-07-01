import { formatEther } from "viem";

/** 0x1234…abcd */
export function shortAddr(addr?: string, size = 4): string {
  if (!addr) return "—";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

/** Format a wei bigint as a trimmed ETH string, e.g. "0.05 ETH". */
export function fmtEth(wei?: bigint, opts: { suffix?: boolean; dp?: number } = {}): string {
  const { suffix = true, dp = 4 } = opts;
  if (wei === undefined) return suffix ? "0 ETH" : "0";
  const n = Number(formatEther(wei));
  const s = n.toLocaleString("pt-BR", { maximumFractionDigits: dp });
  return suffix ? `${s} ETH` : s;
}

/** Convert a wei bigint to a USD string given an ETH price. */
export function fmtUsd(wei: bigint | undefined, ethPrice: number): string {
  if (wei === undefined) return "$0";
  const usd = Number(formatEther(wei)) * ethPrice;
  if (usd >= 1000) return `$${(usd / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/** Seconds → "12:34" mm:ss (or "1:02:03"). */
export function fmtCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (x: number) => x.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Relative time in Portuguese, e.g. "há 3 min". */
export function fmtAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "agora";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} d`;
}
