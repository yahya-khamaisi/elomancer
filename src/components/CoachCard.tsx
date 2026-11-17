import { Brain, Eye, Flame, ShieldBan, Skull, Swords, Timer, type LucideIcon } from "lucide-react";
import { BorderBeam } from "@/components/ui/border-beam";
import { BlurFade } from "@/components/ui/blur-fade";
import type { MatchRow } from "@/types";
import { coachingTips, type Tip } from "@/lib/insights";

const ICON: Record<Tip["kind"], LucideIcon> = {
  deaths: Skull, pool: Swords, tilt: Brain, vision: Eye, objectives: Flame, length: Timer, matchup: ShieldBan,
};

/** The headline feature: the few changes most likely to win more games. */
export function CoachCard({ games }: { games: MatchRow[] }) {
  const tips = coachingTips(games);

  return (
    <BlurFade delay={0.15} inView>
      <section className="relative overflow-hidden rounded-2xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="font-display text-xs font-semibold tracking-[0.2em] text-primary uppercase">Coach</p>
            <h2 className="font-display text-xl font-bold tracking-wide uppercase">Fix this next</h2>
          </div>
          <p className="text-[13px] text-muted-foreground">Ranked by how much each one moves your win rate</p>
        </div>

        {tips.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {games.length < 10
              ? "Coaching needs at least 10 games. Widen the filters above."
              : "Nothing stands out in these games. Your results don't swing much on any one habit."}
          </p>
        ) : (
          <ol className="grid gap-3 sm:grid-cols-2">
            {tips.map((t, i) => {
              const Icon = ICON[t.kind];
              return (
                <li key={t.id} className="flex gap-3 rounded-xl border bg-background/50 p-3.5">
                  <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                    <span className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center rounded-full bg-primary font-display text-[11px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-[15px] font-semibold">{t.title}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{t.detail}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <BorderBeam size={90} duration={11} colorFrom="var(--primary)" colorTo="transparent" />
      </section>
    </BlurFade>
  );
}
