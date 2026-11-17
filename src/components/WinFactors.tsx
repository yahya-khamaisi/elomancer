import { useState } from "react";
import type { MatchRow } from "@/types";
import { winFactors } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Panel } from "./kit";

/**
 * Diverging bars: how much better each stat is in your wins than in your
 * losses. Blue = better in wins, red = better in losses.
 */
export function WinFactors({ matches }: { matches: MatchRow[] }) {
  const factors = winFactors(matches);
  const [hover, setHover] = useState<string | null>(null);

  if (!factors.length) {
    return (
      <Panel title="What wins you games" delay={0.15}>
        <p className="text-sm text-muted-foreground">Needs at least 3 wins and 3 losses.</p>
      </Panel>
    );
  }

  const max = Math.max(...factors.map((f) => Math.abs(f.delta)), 0.1);
  const scaleMax = Math.ceil(max * 10) / 10;
  const top = factors[0];
  const signed = (d: number) => `${d >= 0 ? "+" : "−"}${Math.round(Math.abs(d) * 100)}%`;

  return (
    <Panel title="What wins you games" description="Your average in wins vs. losses, per stat" delay={0.15}>
      <div className="grid gap-0.5" role="list">
        {factors.map((f) => {
          const w = (Math.abs(f.delta) / scaleMax) * 50;
          return (
            <div
              key={f.key}
              role="listitem"
              tabIndex={0}
              onPointerEnter={() => setHover(f.key)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(f.key)}
              onBlur={() => setHover(null)}
              aria-label={`${f.label}: ${f.format(f.inWins)} in wins, ${f.format(f.inLosses)} in losses`}
              className="relative grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-lg px-1.5 py-1.5 outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
            >
              <span className="text-[13px]">{f.label}</span>
              <span className="text-right text-[13px] text-muted-foreground tabular">{signed(f.delta)}</span>
              <span className="relative col-span-2 h-2.5">
                <span className="absolute -top-0.5 -bottom-0.5 left-1/2 w-px bg-[var(--axis)]" />
                <span
                  className={cn("absolute top-0 h-2.5", f.delta >= 0 ? "left-1/2 rounded-r bg-[var(--pos)]" : "right-1/2 rounded-l bg-[var(--neg)]")}
                  style={{ width: `${w}%` }}
                />
              </span>
              {hover === f.key && (
                <div className="pointer-events-none absolute top-full left-1.5 z-10 mt-0.5 rounded-lg border bg-popover px-2.5 py-2 text-[13px] whitespace-nowrap shadow-lg">
                  <b>{f.label}</b>
                  <div>In wins <b className="tabular">{f.format(f.inWins)}</b> <span className="text-muted-foreground">·</span> In losses <b className="tabular">{f.format(f.inLosses)}</b></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between px-1.5 text-xs text-muted-foreground" aria-hidden>
        <span>← Better in losses</span><span>Better in wins →</span>
      </div>
      <p className="mt-auto border-t pt-3 text-[13px] text-muted-foreground">
        Biggest swing: <b className="text-foreground">{top.key === "deaths" ? "deaths" : top.label.toLowerCase()}</b>. You average{" "}
        {top.format(top.inWins)} in wins and {top.format(top.inLosses)} in losses.
      </p>
    </Panel>
  );
}
