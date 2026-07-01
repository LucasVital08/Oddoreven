"use client";

import { motion } from "framer-motion";

/**
 * Ambient 3D-ish flipping token for the hero — one face PAR (even), one ÍMPAR (odd).
 * Purely decorative; respects reduced-motion via the global CSS override.
 */
export function CoinFlip({ size = 220 }: { size?: number }) {
  return (
    <div className="relative grid place-items-center" style={{ perspective: 1000 }}>
      <motion.div
        className="relative"
        style={{ width: size, height: size, transformStyle: "preserve-3d" }}
        animate={{ rotateY: [0, 180, 360] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Face label="PAR" tone="even" />
        <Face label="ÍMPAR" tone="odd" back />
      </motion.div>
      <div
        className="absolute -z-10 rounded-full blur-3xl"
        style={{
          width: size * 1.2,
          height: size * 1.2,
          background: "radial-gradient(circle, rgba(0,230,168,0.28), rgba(255,61,113,0.18), transparent 70%)",
        }}
      />
    </div>
  );
}

function Face({ label, tone, back = false }: { label: string; tone: "even" | "odd"; back?: boolean }) {
  const ring = tone === "even" ? "#00E6A8" : "#FF3D71";
  return (
    <div
      className="absolute inset-0 grid place-items-center rounded-full border-4"
      style={{
        borderColor: ring,
        backfaceVisibility: "hidden",
        transform: back ? "rotateY(180deg)" : undefined,
        background:
          "radial-gradient(circle at 35% 30%, #17223a, #0a0f1a 70%)",
        boxShadow: `0 0 60px -10px ${ring}, inset 0 0 40px -12px ${ring}`,
      }}
    >
      <div className="text-center">
        <div className="font-display text-4xl font-extrabold tracking-tight" style={{ color: ring }}>
          {label}
        </div>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-txt-dim">
          on-chain
        </div>
      </div>
    </div>
  );
}
