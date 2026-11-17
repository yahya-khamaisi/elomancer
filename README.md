# Rift Insights

Ranked League of Legends performance insights built on the Riot Games API:
win-rate trend, champion pool, roles, and a "what wins you games" breakdown
that compares your stats in wins against your stats in losses.

**Stack:** Vite, React 19, TypeScript, hand-built SVG charts (no chart library).

## How it works

```
GitHub Action (daily) ──► scripts/fetch-snapshot.ts ──► public/data/snapshot.json ──► static site (GitHub Pages)
        │                         │
  RIOT_API_KEY secret      Riot API: account-v1, summoner-v4, league-v4, match-v5
```

- The Riot API key lives only in the GitHub Actions secret. The browser only
  ever loads a static JSON snapshot, so the key can't leak and the site can't
  hit rate limits.
- The snapshot keeps only what the page shows: no PUUIDs, and dates without
  times of day.
- Without a key, the app runs on deterministic sample data
  (`npm run snapshot:sample`) and says so on the page.

## Run locally

```bash
npm install
npm run dev
```

To load real games, copy `.env.example` to `.env`, add a key from
[developer.riotgames.com](https://developer.riotgames.com), then:

```bash
npm run snapshot
```

## Deploy

1. Push to GitHub and set **Settings → Pages → Source** to *GitHub Actions*.
2. Add the repository secret `RIOT_API_KEY`. Optional repository variables:
   `RIOT_ID` (default `khamayseh#456`), `PLATFORM` (`euw1`), `REGION` (`europe`),
   `SEASON_START` (e.g. `2026-01-08`).
3. The workflow refreshes data daily at 05:17 UTC, on every push, and on demand.

Development keys expire every 24 hours. For a daily job that keeps working,
register a **Personal API Key** in the Riot developer portal (free; approval
takes a few days).

---

Rift Insights isn't endorsed by Riot Games and doesn't reflect the views or
opinions of Riot Games or anyone officially involved in producing or managing
Riot Games properties. Riot Games and all associated properties are trademarks
or registered trademarks of Riot Games, Inc.
