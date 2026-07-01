export function LiveBadge({ label = "AO VIVO", tone = "even" }: { label?: string; tone?: "even" | "odd" | "gold" }) {
  const color = tone === "odd" ? "bg-odd" : tone === "gold" ? "bg-gold" : "bg-even";
  const text = tone === "odd" ? "text-odd" : tone === "gold" ? "text-gold" : "text-even";
  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${text}`}>
      <span className={`h-2 w-2 rounded-full ${color} animate-pulse-dot`} />
      {label}
    </span>
  );
}
