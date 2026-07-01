"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/** Smoothly animates a number from its previous value to the new one. */
export function CountUp({
  value,
  decimals = 4,
  className = "",
  suffix = "",
}: {
  value: number;
  decimals?: number;
  className?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);

  return (
    <span className={`num ${className}`}>
      {display.toLocaleString("pt-BR", { maximumFractionDigits: decimals, minimumFractionDigits: 0 })}
      {suffix}
    </span>
  );
}
