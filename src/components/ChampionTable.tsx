import type { MatchRow } from "../types.ts";
import { byChampion, championIcon, championName, pct } from "../lib/stats.ts";

export function ChampionTable({ matches, version }: { matches: MatchRow[]; version: string }) {
  const rows = byChampion(matches).slice(0, 10);
  return (
    <div className="card span-7">
      <h2>Champion pool</h2>
      <p className="sub">Most-played champions this season</p>
      <div className="scroll-x">
        <table>
          <thead>
            <tr>
              <th>Champion</th>
              <th className="num">Games</th>
              <th className="num">Win rate</th>
              <th className="num">KDA</th>
              <th className="num hide-sm">CS/min</th>
              <th className="num hide-sm">Dmg/min</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.champion}>
                <td>
                  <span className="champ">
                    <img src={championIcon(version, r.champion)} alt="" loading="lazy" width={28} height={28} />
                    {championName(r.champion)}
                  </span>
                </td>
                <td className="num">{r.games}</td>
                <td className="num">
                  <span className="wr">
                    {pct(r.winRate)}
                    <span className="meter" aria-hidden><i style={{ width: pct(r.winRate) }} /></span>
                  </span>
                </td>
                <td className="num">{r.kda.toFixed(2)}</td>
                <td className="num hide-sm">{r.csPerMin.toFixed(1)}</td>
                <td className="num hide-sm">{Math.round(r.damagePerMin)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
