import { useEffect, useMemo, useState } from "react";
import { CodeXml, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GridPattern } from "@/components/ui/grid-pattern";
import type { Snapshot } from "@/types";
import { byRole } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Hero } from "@/components/Hero";
import { FilterBar, type Filters } from "@/components/FilterBar";
import { StatTiles } from "@/components/StatTiles";
import { CoachCard } from "@/components/CoachCard";
import { WinRateTrend } from "@/components/WinRateTrend";
import { WinFactors } from "@/components/WinFactors";
import { ChampionTable } from "@/components/ChampionTable";
import { Matchups } from "@/components/Matchups";
import { GameLengthCard, TiltCard } from "@/components/Habits";
import { MatchHistory } from "@/components/MatchHistory";

export const APP_NAME = "Jungle Diff";

export function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ range: "all", role: "ALL", champion: null });

  useEffect(() => {
    // no-cache: revalidate with GitHub Pages on every visit so a fresh daily snapshot shows at once.
    fetch(`${import.meta.env.BASE_URL}data/snapshot.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Role and champion first, then the range: "last 20 jungle games".
  const games = useMemo(() => {
    if (!data) return [];
    const scoped = data.matches.filter(
      (m) => (filters.role === "ALL" || m.role === filters.role) && (!filters.champion || m.champion === filters.champion),
    );
    return filters.range === "all" ? scoped : scoped.slice(0, Number(filters.range));
  }, [data, filters]);

  if (error) return <Shell><p className="py-20 text-center">Couldn't load the stats snapshot ({error}).</p></Shell>;
  if (!data) return <Shell><p className="py-20 text-center text-muted-foreground">Loading…</p></Shell>;

  const v = data.ddragonVersion;
  const roles = byRole(data.matches);

  return (
    <Shell>
      <div className="grid gap-4">
        <Hero data={data} />

        {data.sample && (
          <p className="rounded-xl border border-dashed px-4 py-2.5 text-sm text-muted-foreground">
            Sample data. Add a Riot API key and run <code className="font-mono text-[13px]">npm run snapshot</code> to load real games.
          </p>
        )}

        <FilterBar
          filters={filters}
          onChange={(next) => {
            // Switching role drops a champion you never played in that role.
            const keep = next.champion && data.matches.some(
              (m) => m.champion === next.champion && (next.role === "ALL" || m.role === next.role),
            );
            setFilters({ ...next, champion: keep ? next.champion : null });
          }}
          roles={roles}
          games={games.length}
          version={v}
        />

        {games.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>No games match these filters.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilters({ range: "all", role: "ALL", champion: null })}>
              Reset filters
            </Button>
          </div>
        ) : (
          <>
            <StatTiles games={games} season={data.matches} />
            <CoachCard games={games} />
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7"><WinRateTrend matches={games} /></div>
              <div className="lg:col-span-5"><WinFactors matches={games} /></div>
            </div>
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <ChampionTable
                  matches={filters.champion ? data.matches.filter((m) => filters.role === "ALL" || m.role === filters.role) : games}
                  version={v}
                  selected={filters.champion}
                  onSelect={(champion) => setFilters((f) => ({ ...f, champion }))}
                />
              </div>
              <div className="lg:col-span-5"><Matchups games={games} version={v} role={filters.role} /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TiltCard games={games} />
              <GameLengthCard games={games} />
            </div>
            <MatchHistory key={JSON.stringify(filters)} games={games} version={v} />
          </>
        )}
      </div>
    </Shell>
  );
}

/** Page frame: nav, background pattern, footer. */
function Shell({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch { /* storage blocked */ }
  }, [dark]);

  return (
    <div className="relative min-h-screen overflow-x-clip">
      <GridPattern
        width={44}
        height={44}
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[520px] stroke-foreground/[0.06] fill-transparent",
          "[mask-image:radial-gradient(600px_circle_at_50%_0%,white,transparent)]",
        )}
        squares={[[4, 2], [9, 1], [14, 3], [20, 1], [25, 4], [30, 2]]}
      />
      <main className="relative mx-auto max-w-6xl px-4 pt-5 pb-12 sm:px-6">
        <nav className="mb-5 flex items-center justify-between">
          <a href="./" className="flex items-center gap-2 font-display text-lg font-bold tracking-[0.14em] uppercase">
            <Logo />
            {APP_NAME}
          </a>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" nativeButton={false} aria-label="Source code on GitHub"
              render={<a href="https://github.com/yahya-khamaisi/rift-insights" target="_blank" rel="noreferrer" />}>
              <CodeXml />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setDark((d) => !d)} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </nav>
        {children}
        <footer className="mt-10 text-xs leading-relaxed text-muted-foreground">
          {APP_NAME} is built on the Riot Games API and Data Dragon. Data refreshes daily from a scheduled job; the API
          key never reaches the browser. {APP_NAME} isn't endorsed by Riot Games and doesn't reflect the views or opinions
          of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all
          associated properties are trademarks or registered trademarks of Riot Games, Inc.
        </footer>
      </main>
    </div>
  );
}

function Logo() {
  // Two crossed claws: a jungle mark, not a Riot logo.
  return (
    <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 23 L15 9 M15 23 L21 9 M21 23 L24 16" stroke="var(--primary-foreground)" strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}
