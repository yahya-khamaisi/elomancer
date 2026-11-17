import { X } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Role } from "@/types";
import { championName, ROLE_LABEL } from "@/lib/stats";
import { ChampIcon } from "./kit";

export type Range = "20" | "50" | "all";
export interface Filters { range: Range; role: Role | "ALL"; champion: string | null }

export function FilterBar({
  filters, onChange, roles, games, version,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  roles: { role: Role; games: number }[];
  games: number;
  version: string;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="sticky top-0 z-40 -mx-4 border-b bg-background/80 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Group label="Games">
          <ToggleGroup
            value={[filters.range]}
            onValueChange={(v) => v[0] && set({ range: v[0] as Range })}
            variant="outline"
            size="sm"
            spacing={0}
          >
            <ToggleGroupItem value="20">Last 20</ToggleGroupItem>
            <ToggleGroupItem value="50">Last 50</ToggleGroupItem>
            <ToggleGroupItem value="all">Season</ToggleGroupItem>
          </ToggleGroup>
        </Group>

        {roles.length > 1 && (
          <Group label="Role">
            <ToggleGroup
              value={[filters.role]}
              onValueChange={(v) => v[0] && set({ role: v[0] as Filters["role"] })}
              variant="outline"
              size="sm"
              spacing={0}
            >
              <ToggleGroupItem value="ALL">All</ToggleGroupItem>
              {roles.map((r) => (
                <ToggleGroupItem key={r.role} value={r.role}>{ROLE_LABEL[r.role]}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Group>
        )}

        {filters.champion && (
          <button
            onClick={() => set({ champion: null })}
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-1 pr-2.5 pl-1 text-sm font-medium hover:bg-primary/15"
            aria-label={`Clear champion filter ${championName(filters.champion)}`}
          >
            <ChampIcon version={version} id={filters.champion} size={22} className="rounded-full" />
            {championName(filters.champion)}
            <X className="size-3.5 opacity-70" />
          </button>
        )}

        <span className="ml-auto text-xs text-muted-foreground tabular">
          {games} game{games === 1 ? "" : "s"}
          {!filters.champion && <span className="hidden sm:inline"> · click a champion to focus on it</span>}
        </span>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</span>
      {children}
    </div>
  );
}
