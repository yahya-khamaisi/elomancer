// Small shared pieces: the glowing panel every section sits in, champion
// icons, and the win/loss pill.

import type { ReactNode } from "react";
import { MagicCard } from "@/components/ui/magic-card";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";
import { championIcon, championName } from "@/lib/stats";

export function Panel({
  title, description, action, children, className, delay = 0,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <BlurFade delay={delay} inView className={cn("min-w-0", className)}>
      <MagicCard
        className="h-full rounded-2xl"
        gradientColor="var(--glow)"
        gradientFrom="color-mix(in oklab, var(--primary) 55%, transparent)"
        gradientTo="color-mix(in oklab, var(--series-1) 35%, transparent)"
        gradientSize={260}
        gradientOpacity={1}
      >
        <div className="flex h-full flex-col p-5">
          {(title || action) && (
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title && <h2 className="font-display text-base font-semibold tracking-wide uppercase">{title}</h2>}
                {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
              </div>
              {action}
            </div>
          )}
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </MagicCard>
    </BlurFade>
  );
}

export function ChampIcon({
  version, id, size = 32, className, ring,
}: { version: string; id: string; size?: number; className?: string; ring?: "win" | "loss" }) {
  return (
    <img
      src={championIcon(version, id)}
      alt={championName(id)}
      title={championName(id)}
      width={size}
      height={size}
      loading="lazy"
      className={cn(
        "shrink-0 rounded-lg bg-muted object-cover",
        ring === "win" && "ring-2 ring-win/70",
        ring === "loss" && "ring-2 ring-loss/70",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

export function ResultPill({ win, className }: { win: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-bold text-white",
        win ? "bg-win" : "bg-loss",
        className,
      )}
    >
      {win ? "W" : "L"}
    </span>
  );
}

/** Thin horizontal meter: a value 0..1 with an optional reference tick. */
export function Meter({ value, reference, className, tone = "series" }: {
  value: number; reference?: number; className?: string; tone?: "series" | "primary";
}) {
  return (
    <div className={cn("relative h-2 w-full rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700", tone === "primary" ? "bg-primary" : "bg-series")}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
      {reference !== undefined && (
        <div
          className="absolute -top-1 -bottom-1 w-0.5 rounded bg-foreground/60"
          style={{ left: `calc(${reference * 100}% - 1px)` }}
          aria-hidden
        />
      )}
    </div>
  );
}
