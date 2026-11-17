import { BorderBeam } from "@/components/ui/border-beam";
import { BlurFade } from "@/components/ui/blur-fade";
import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { Snapshot } from "@/types";
import { profileIcon } from "@/lib/stats";

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export function Hero({ data }: { data: Snapshot }) {
  const { player, ranked, ddragonVersion: v } = data;
  const seasonWr = ranked ? ranked.wins / Math.max(1, ranked.wins + ranked.losses) : null;
  const updated = new Date(data.generatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" });

  return (
    <BlurFade delay={0.05}>
      <section className="relative overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 35%, transparent), transparent 70%)" }}
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <div className="relative">
            <img
              src={profileIcon(v, player.profileIconId)}
              alt=""
              width={76}
              height={76}
              className="size-[76px] rounded-2xl bg-muted object-cover ring-2 ring-primary/50"
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
            />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border bg-background px-2 py-0.5 font-display text-[11px] font-semibold tabular">
              {player.summonerLevel}
            </span>
          </div>

          <div className="min-w-[220px] flex-1">
            <div className="inline-flex max-w-full items-center rounded-full border bg-background/60 px-2.5 py-0.5 text-xs">
              <AnimatedShinyText className="mx-0 truncate font-medium">
                {player.platform.replace(/\d+$/, "").toUpperCase()} · Ranked Solo/Duo · updated {updated}
              </AnimatedShinyText>
            </div>
            <h1 className="mt-2 truncate font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {player.gameName}
              <span className="font-medium text-muted-foreground"> #{player.tagLine}</span>
            </h1>
            {ranked && (
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-display text-lg font-semibold text-foreground">
                  {titleCase(ranked.tier)} {ranked.rank}
                </span>{" "}
                · <NumberTicker value={ranked.lp} className="font-semibold text-foreground" /> LP ·{" "}
                <span className="tabular">{ranked.wins}W {ranked.losses}L</span>
              </p>
            )}
          </div>

          {seasonWr !== null && (
            <div className="flex items-center gap-3 max-sm:w-full max-sm:border-t max-sm:pt-4">
              <AnimatedCircularProgressBar
                value={Math.round(seasonWr * 100)}
                gaugePrimaryColor="var(--primary)"
                gaugeSecondaryColor="var(--muted)"
                className="size-24 font-display text-xl"
              />
              <div className="text-xs leading-tight text-muted-foreground">
                Season
                <br />
                win rate
              </div>
            </div>
          )}
        </div>
        <BorderBeam size={120} duration={9} colorFrom="var(--primary)" colorTo="var(--series-1)" />
      </section>
    </BlurFade>
  );
}
