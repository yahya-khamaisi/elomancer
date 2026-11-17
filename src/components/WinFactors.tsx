import { useState } from "react";
import type { MatchRow } from "../types.ts";
import { winFactors } from "../lib/stats.ts";

/**
 * Diverging bars: how much better each stat is in your wins than in your
 * losses. Blue = better in wins, red = better in losses.
 */
export function WinFactors({ matches }: { matches: MatchRow[] }) {
  const factors = winFactors(matches);
  const [hover, setHover] = useState<string | null>(null);

  if (!factors.length) {
    return (
      <div className="card span-5">
        <h2>What wins you games</h2>
        <p className="sub">Needs at least 3 wins and 3 losses.</p>
      </div>
    );
  }

  // Symmetric scale so left and right bars are comparable.
  const max = Math.max(...factors.map((f) => Math.abs(f.delta)), 0.1);
  const scaleMax = Math.ceil(max * 10) / 10;
  const top = factors[0];
  const signed = (d: number) => `${d >= 0 ? "+" : "−"}${Math.round(Math.abs(d) * 100)}%`;

  return (
    <div className="card span-5">
      <h2>What wins you games</h2>
      <p className="sub">Your average in wins vs. losses, per stat</p>
      <div className="factors" role="list">
        {factors.map((f) => {
          const w = (Math.abs(f.delta) / scaleMax) * 50;
          return (
            <div key={f.key} className="factor" role="listitem" tabIndex={0}
              onPointerEnter={() => setHover(f.key)} onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(f.key)} onBlur={() => setHover(null)}
              aria-label={`${f.label}: ${f.format(f.inWins)} in wins, ${f.format(f.inLosses)} in losses`}>
              <span className="name">{f.label}</span>
              <span className="track">
                <span className={`bar ${f.delta >= 0 ? "pos" : "neg"}`} style={{ width: `${w}%` }} />
              </span>
              <span className="val">{signed(f.delta)}</span>
              {hover === f.key && (
                <div className="tip">
                  <div><b>{f.label}</b></div>
                  <div>In wins <b>{f.format(f.inWins)}</b> <span className="muted">·</span> In losses <b>{f.format(f.inLosses)}</b></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="axis-labels" aria-hidden>
        <div><span>← Better in losses</span><span>Better in wins →</span></div>
      </div>
      <p className="insight">
        Biggest swing: <b>{top.key === "deaths" ? "deaths" : top.label.toLowerCase()}</b>. You average {top.format(top.inWins)} in wins
        and {top.format(top.inLosses)} in losses.
        {top.key === "deaths" && " Staying alive matters more than any other stat you track."}
      </p>
    </div>
  );
}
