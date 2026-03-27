import { prisma, GameStatus } from "@edgeiq/db";
import { getOdds, getScores, type RateLimitInfo } from "../clients/oddsApi";

export interface IngestOddsResult {
  sport: string;
  gamesProcessed: number;
  snapshotsCreated: number;
  rateLimit: RateLimitInfo;
}

export interface UpdateScoresResult {
  sport: string;
  gamesUpdated: number;
}

export async function ingestOddsForSport(
  sport: string,
  markets: string[],
  options: { commenceTimeFrom?: string; commenceTimeTo?: string } = {}
): Promise<IngestOddsResult> {
  const { games, rateLimit } = await getOdds(sport, markets, options);
  const capturedAt = new Date();
  let snapshotsCreated = 0;

  for (const game of games) {
    const dbGame = await prisma.game.upsert({
      where: { externalId: game.id },
      update: { homeTeam: game.home_team, awayTeam: game.away_team, commenceTime: new Date(game.commence_time), sportTitle: game.sport_title, updatedAt: new Date() },
      create: { externalId: game.id, sport: game.sport_key, sportTitle: game.sport_title, homeTeam: game.home_team, awayTeam: game.away_team, commenceTime: new Date(game.commence_time), status: GameStatus.SCHEDULED },
    });

    const snapshots = [];
    for (const bookmaker of game.bookmakers) {
      const bookmakerUpdatedAt = bookmaker.last_update ? new Date(bookmaker.last_update) : null;
      for (const market of bookmaker.markets) {
        const base = { gameId: dbGame.id, bookmaker: bookmaker.key, market: market.key, capturedAt, bookmakerUpdatedAt };
        if (market.key === "h2h") {
          const h = market.outcomes.find((o) => o.name === game.home_team);
          const a = market.outcomes.find((o) => o.name === game.away_team);
          if (h && a) snapshots.push({ ...base, homeOdds: h.price, awayOdds: a.price });
        } else if (market.key === "spreads") {
          const h = market.outcomes.find((o) => o.name === game.home_team);
          const a = market.outcomes.find((o) => o.name === game.away_team);
          if (h && a) snapshots.push({ ...base, homeOdds: h.price, awayOdds: a.price, spread: h.point ?? null });
        } else if (market.key === "totals") {
          const ov = market.outcomes.find((o) => o.name === "Over");
          const un = market.outcomes.find((o) => o.name === "Under");
          if (ov && un) snapshots.push({ ...base, homeOdds: ov.price, awayOdds: un.price, total: ov.point ?? null });
        }
      }
    }
    if (snapshots.length > 0) {
      const result = await prisma.oddsSnapshot.createMany({ data: snapshots });
      snapshotsCreated += result.count;
    }
  }
  return { sport, gamesProcessed: games.length, snapshotsCreated, rateLimit };
}

export async function updateGameScoresForSport(sport: string): Promise<UpdateScoresResult> {
  const scoreGames = await getScores(sport, 1);
  let gamesUpdated = 0;
  for (const sg of scoreGames) {
    const newStatus = sg.completed ? GameStatus.FINAL : new Date(sg.commence_time) <= new Date() ? GameStatus.LIVE : GameStatus.SCHEDULED;
    const homeScore = sg.scores?.find((s) => s.name === sg.home_team)?.score;
    const awayScore = sg.scores?.find((s) => s.name === sg.away_team)?.score;
    const updated = await prisma.game.updateMany({
      where: { externalId: sg.id },
      data: { status: newStatus, updatedAt: new Date(), ...(homeScore !== undefined && { homeScore: parseInt(homeScore, 10) }), ...(awayScore !== undefined && { awayScore: parseInt(awayScore, 10) }) },
    });
    gamesUpdated += updated.count;
  }
  return { sport, gamesUpdated };
}
