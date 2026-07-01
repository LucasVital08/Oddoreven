"use client";

/** PAR / ÍMPAR side toggle with team colours. */
export function SideToggle({ isOdd, onChange }: { isOdd: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onChange(false)}
        className={`rounded-xl border-2 py-4 font-display text-lg font-extrabold transition-all ${
          !isOdd
            ? "border-even bg-even/10 text-even shadow-glow"
            : "border-line-2 text-txt-dim hover:border-even/50"
        }`}
      >
        PAR
      </button>
      <button
        onClick={() => onChange(true)}
        className={`rounded-xl border-2 py-4 font-display text-lg font-extrabold transition-all ${
          isOdd ? "border-odd bg-odd/10 text-odd shadow-glow-odd" : "border-line-2 text-txt-dim hover:border-odd/50"
        }`}
      >
        ÍMPAR
      </button>
    </div>
  );
}

/** Number picker 0..max. */
export function NumberPicker({
  value,
  onChange,
  max = 5,
  tone = "even",
}: {
  value: number;
  onChange: (n: number) => void;
  max?: number;
  tone?: "even" | "odd";
}) {
  const on = tone === "odd" ? "border-odd bg-odd/15 text-odd" : "border-even bg-even/15 text-even";
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: max + 1 }).map((_, n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-12 w-12 rounded-xl border-2 font-display text-lg font-extrabold num transition-all ${
            value === n ? on : "border-line-2 text-txt-dim hover:border-line-2 hover:text-txt"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
