export function StatTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "default" | "even" | "odd" | "gold";
}) {
  const valColor =
    tone === "even" ? "text-even" : tone === "odd" ? "text-odd" : tone === "gold" ? "gold-text" : "text-txt";
  return (
    <div className="card p-4">
      <div className="eyebrow">{label}</div>
      <div className={`stat-num mt-2 text-2xl ${valColor}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-txt-dim num">{sub}</div>}
    </div>
  );
}
