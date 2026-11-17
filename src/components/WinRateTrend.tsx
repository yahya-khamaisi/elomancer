import { useEffect, useRef, useState } from "react";
import type { MatchRow } from "../types.ts";
import { championName, pct, rollingWinRate } from "../lib/stats.ts";

const MIN_H = 240;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };
const WINDOW = 10;

/** Rolling 10-game win rate with a 50% reference line, crosshair and tooltip. */
export function WinRateTrend({ matches }: { matches: MatchRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [H, setH] = useState(MIN_H);
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => {
      setWidth(e.contentRect.width);
      setH(Math.max(MIN_H, Math.floor(e.contentRect.height)));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const all = rollingWinRate(matches, WINDOW);
  // Plot full windows only; the first few games would swing between 0% and 100%.
  const points = all.length >= WINDOW * 2 ? all.slice(WINDOW - 1) : all;
  const n = points.length;
  const innerW = Math.max(10, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - v) * innerH;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.winRate).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const xTicks = n > 1 ? [0, Math.floor((n - 1) / 2), n - 1] : [0];
  const latest = points[n - 1];

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / box.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(rel * (n - 1)))));
  }

  const h = hover !== null ? points[hover] : null;

  return (
    <div className="card span-7 fill">
      <div className="card-head">
        <div>
          <h2>Win rate trend</h2>
          <p className="sub">
            Rolling {WINDOW}-game win rate across {all.length} ranked games
            {latest && <> · now <b>{pct(latest.winRate)}</b></>}
          </p>
        </div>
        <button className="toggle" onClick={() => setAsTable((t) => !t)} aria-pressed={asTable}>
          {asTable ? "Chart" : "Table"}
        </button>
      </div>

      {asTable ? (
        <div className="scroll-x" style={{ maxHeight: 360, overflowY: "auto" }}>
          <table>
            <thead><tr><th>Game</th><th>Date</th><th>Champion</th><th>Result</th><th className="num">Rolling WR</th></tr></thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.game}>
                  <td>{p.game}</td><td>{p.date}</td><td>{championName(p.champion)}</td>
                  <td>{p.win ? "Win" : "Loss"}</td><td className="num">{pct(p.winRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart" ref={ref}>
          <svg height={H} role="img" aria-label={`Rolling win rate, currently ${latest ? pct(latest.winRate) : "n/a"}`}>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line x1={PAD.left} x2={PAD.left + innerW} y1={y(v)} y2={y(v)}
                  stroke={v === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1}
                  strokeDasharray={v === 0.5 ? "4 4" : undefined} />
                <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end">{pct(v)}</text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
                Game {points[i]?.game}
              </text>
            ))}
            <path d={area} fill="var(--series-1-soft)" />
            <path d={line} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {h && hover !== null && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={y(0)} stroke="var(--axis)" strokeWidth={1} />
                <circle cx={x(hover)} cy={y(h.winRate)} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
              </g>
            )}
            <rect x={PAD.left} y={0} width={innerW} height={H} fill="transparent"
              onPointerMove={onMove} onPointerLeave={() => setHover(null)} style={{ cursor: "crosshair" }} />
          </svg>
          {h && hover !== null && (
            <div className="tip" style={{
              left: Math.min(Math.max(x(hover) - 80, 0), width - 170),
              top: Math.max(y(h.winRate) - 76, 0),
            }}>
              <div className="muted">Game {h.game} · {h.date}</div>
              <div>{championName(h.champion)} · {h.win ? "Win" : "Loss"}</div>
              <div>Rolling win rate <b>{pct(h.winRate)}</b>
                {h.sampleSize < WINDOW && <span className="muted"> ({h.sampleSize} games)</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
