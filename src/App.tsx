import { useEffect, useState } from "react";
import type { Snapshot } from "./types.ts";
import { currentStreak, pct, profileIcon, summary } from "./lib/stats.ts";
import { WinRateTrend } from "./components/WinRateTrend.tsx";
import { WinFactors } from "./components/WinFactors.tsx";
import { ChampionTable } from "./components/ChampionTable.tsx";
import { RoleSplit } from "./components/RoleSplit.tsx";

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // no-cache: revalidate with GitHub Pages on every visit so a fresh daily snapshot shows at once.
    fetch(`${import.meta.env.BASE_URL}data/snapshot.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <main className="wrap"><p>Couldn't load the stats snapshot ({error}).</p></main>;
  if (!data) return <main className="wrap"><p className="sub">Loading…</p></main>;

  const { player, ranked, matches, ddragonVersion: v } = data;
  const s = summary(matches);
  const streak = currentStreak(matches);
  const recent = matches.slice(0, 20);
  const updated = new Date(data.generatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  return (
    <main className="wrap">
      <header className="top">
        <img className="avatar" src={profileIcon(v, player.profileIconId)} alt="" width={64} height={64}
          onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
        <div className="who">
          <h1>{player.gameName} <span>#{player.tagLine}</span></h1>
          <p>{player.platform.replace(/\d+$/, "").toUpperCase()} · Level {player.summonerLevel} · Ranked Solo/Duo · Updated {updated}</p>
        </div>
        {ranked && (
          <div className="rank">
            <b>{titleCase(ranked.tier)} {ranked.rank} · {ranked.lp} LP</b>
            <small>{ranked.wins}W {ranked.losses}L · {pct(ranked.wins / (ranked.wins + ranked.losses))} season win rate</small>
          </div>
        )}
      </header>

      {data.sample && (
        <p className="notice">
          Sample data. Add a Riot API key and run <code>npm run snapshot</code> to load real games.
        </p>
      )}

      <section className="grid">
        <Kpi label="Win rate" value={pct(s.winRate)} note={`${s.wins}W ${s.losses}L in ${s.games} games`} />
        <Kpi label="KDA" value={s.kda.ratio.toFixed(2)}
          note={`${s.kda.k.toFixed(1)} / ${s.kda.d.toFixed(1)} / ${s.kda.a.toFixed(1)} per game`} />
        <Kpi label="CS per minute" value={s.csPerMin.toFixed(1)} note={`${pct(s.killParticipation)} kill participation`} />
        <div className="card span-3 kpi">
          <div className="label">Last 20 games</div>
          <div className="value">{streak.length}{streak.win ? "W" : "L"} <span style={{ fontSize: 15, fontWeight: 450, color: "var(--ink-2)" }}>streak</span></div>
          <div className="form" aria-label={`Last ${recent.length} games, newest first`}>
            {recent.map((m) => (
              <span key={m.id} className={m.win ? "w" : "l"} title={`${m.date} · ${m.champion} · ${m.win ? "Win" : "Loss"}`}>
                {m.win ? "W" : "L"}
              </span>
            ))}
          </div>
        </div>

        <WinRateTrend matches={matches} />
        <WinFactors matches={matches} />
        <ChampionTable matches={matches} version={v} />
        <RoleSplit matches={matches} />
      </section>

      <footer>
        Built with the Riot Games API and Data Dragon. Data refreshes daily from a scheduled job; the API key never
        reaches the browser. Rift Insights isn't endorsed by Riot Games and doesn't reflect the views or opinions of
        Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all
        associated properties are trademarks or registered trademarks of Riot Games, Inc.
      </footer>
    </main>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card span-3 kpi">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      <div className="note">{note}</div>
    </div>
  );
}
