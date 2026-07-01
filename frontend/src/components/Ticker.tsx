const ITEMS = [
  { t: "PROVABLY FAIR", tone: "text-even" },
  { t: "SEU ETH TRAVADO NO CONTRATO ATÉ O FECHO", tone: "text-txt-dim" },
  { t: "COMISSÃO 1% SÓ NO ENCERRAMENTO", tone: "text-gold" },
  { t: "DESAFIE QUALQUER CARTEIRA", tone: "text-txt-dim" },
  { t: "PAR ou ÍMPAR · 1v1 · ON-CHAIN", tone: "text-odd" },
  { t: "COMMIT · REVEAL · REVANCHE", tone: "text-even" },
  { t: "REVANCHE ILIMITADA NA MESMA SALA", tone: "text-txt-dim" },
];

export function Ticker() {
  const strip = (
    <div className="flex shrink-0 items-center gap-8 px-4">
      {ITEMS.map((it, i) => (
        <span key={i} className="flex items-center gap-8">
          <span className={`font-mono text-[11px] font-bold uppercase tracking-[0.14em] ${it.tone}`}>
            {it.t}
          </span>
          <span className="text-txt-faint">◆</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative overflow-hidden border-b border-line/60 bg-panel/60 py-2 backdrop-blur">
      <div className="flex w-max animate-ticker" aria-hidden>
        {strip}
        {strip}
      </div>
    </div>
  );
}
