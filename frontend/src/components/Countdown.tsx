"use client";

import { useEffect, useState } from "react";
import { fmtCountdown } from "@/lib/format";

/** Live-ticking countdown to a unix timestamp (seconds). Calls onExpire once. */
export function useCountdown(targetTs?: number) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  if (!targetTs) return { remaining: 0, expired: true, label: "00:00" };
  const remaining = Math.max(0, targetTs - now);
  return { remaining, expired: remaining <= 0, label: fmtCountdown(remaining) };
}

export function CountdownRing({
  targetTs,
  totalSeconds,
  tone = "even",
}: {
  targetTs: number;
  totalSeconds: number;
  tone?: "even" | "odd" | "gold";
}) {
  const { remaining, label } = useCountdown(targetTs);
  const frac = Math.max(0, Math.min(1, remaining / totalSeconds));
  const stroke = tone === "odd" ? "#FF3D71" : tone === "gold" ? "#FFC24B" : "#00E6A8";
  const R = 26;
  const C = 2 * Math.PI * R;
  const danger = remaining < 60;
  return (
    <div className="relative grid h-16 w-16 place-items-center">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={R} fill="none" stroke="#1E2A3E" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke={danger ? "#FF4D4D" : stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <span className={`absolute font-mono text-xs font-bold num ${danger ? "text-danger" : "text-txt"}`}>
        {label}
      </span>
    </div>
  );
}
