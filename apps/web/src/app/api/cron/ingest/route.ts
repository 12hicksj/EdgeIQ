import { NextRequest, NextResponse } from "next/server";
import { ingestOddsForSport, updateGameScoresForSport } from "@edgeiq/ingestion/services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SPORTS = ["americanfootball_nfl", "basketball_nba"];
const MARKETS = ["h2h", "spreads", "totals"];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const commenceTimeTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const [oddsResults, scoreResults] = await Promise.all([
    Promise.all(SPORTS.map((sport) => ingestOddsForSport(sport, MARKETS, { commenceTimeTo }))),
    Promise.all(SPORTS.map((sport) => updateGameScoresForSport(sport))),
  ]);
  return NextResponse.json({ ok: true, ingestedAt: new Date().toISOString(), odds: oddsResults, scores: scoreResults });
}
