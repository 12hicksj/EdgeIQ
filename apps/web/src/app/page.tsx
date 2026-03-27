export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@edgeiq/db";
import { Prisma } from "@prisma/client";
import { generateDailyDigest, analyzeUnanalyzedGames } from "@edgeiq/ai";
import { ingestOddsForSport } from "@edgeiq/ingestion/services";
import { GameCard } from "@/components/GameCard";
import { GamesFilter } from "@/components/GamesFilter";
import { detectLineMovement, detectReverseLineMovement } from "@edgeiq/models";
import type { LineMovementResult } from "@edgeiq/models";

const SPORTS = ["americanfootball_nfl", "basketball_nba", "basketball_ncaab"];
const MARKETS = ["h2h", "spreads", "totals"];
const STALE_AFTER_MS = 5 * 60 * 1000;

async function ingestIfStale(): Promise<void> {
  const latest = await prisma.oddsSnapshot.findFirst({
    orderBy: { capturedAt: "desc" },
    select: { capturedAt: true },
  });

  const isStale =
    !latest || Date.now() - latest.capturedAt.getTime() > STALE_AFTER_MS;

  if (!isStale) return;

  const commenceTimeTo = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  await Promise.all(
    SPORTS.map((sport) =>
      ingestOddsForSport(sport, MARKETS, { commenceTimeTo })
    )
  );

  await analyzeUnanalyzedGames();
}

const VALID_SORT_FIELDS = ["commenceTime", "homeTeam", "awayTeam", "sport"] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

interface SearchParams {
  sport?: string;
  team?: string;
  sort?: string;
  order?: string;
  days?: string;
}

async function getDailyDigest(): Promise<string | null> {
  try {
    return await generateDailyDigest(new Date());
  } catch {
    return null;
  }
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-gray-900 rounded-lg border border-gray-700 h-64 animate-pulse" />
      ))}
    </div>
  );
}

async function GamesGrid({ searchParams }: { searchParams: SearchParams }) {
  await ingestIfStale();

  const sort: SortField =
    VALID_SORT_FIELDS.find((f) => f === searchParams.sort) ?? "commenceTime";
  const order = searchParams.order === "desc" ? "desc" : "asc";
  const days = Math.min(Math.max(parseInt(searchParams.days || "1", 10), 1), 7);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const where: Prisma.GameWhereInput = {
    commenceTime: { gte: start, lt: end },
    ...(searchParams.sport && { sport: searchParams.sport }),
    ...(searchParams.team && {
      OR: [
        { homeTeam: { contains: searchParams.team, mode: "insensitive" } },
        { awayTeam: { contains: searchParams.team, mode: "insensitive" } },
      ],
    }),
  };

  const games = await prisma.game.findMany({
    where,
    include: {
      oddsSnapshots: { orderBy: { capturedAt: "asc" } },
      publicBettingData: { orderBy: { capturedAt: "desc" }, take: 1 },
      aiAnalyses: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
    orderBy: { [sort]: order },
  });

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">No games found.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((game) => {
        const lineMovement: LineMovementResult = detectLineMovement(game.oddsSnapshots);
        const publicBetting = game.publicBettingData[0] ?? null;
        if (publicBetting) {
          lineMovement.isSharp = detectReverseLineMovement(publicBetting, lineMovement);
        }
        return (
          <GameCard
            key={game.id}
            game={game}
            odds={game.oddsSnapshots}
            lineMovement={lineMovement}
            publicBetting={publicBetting}
            aiAnalysis={game.aiAnalyses[0] ?? null}
          />
        );
      })}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [digest, sportRows] = await Promise.all([
    getDailyDigest(),
    prisma.game.findMany({
      select: { sport: true, sportTitle: true },
      distinct: ["sport"],
      orderBy: { sport: "asc" },
    }),
  ]);

  const sports = sportRows.map((r) => ({ key: r.sport, title: r.sportTitle || r.sport }));

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">EdgeIQ</h1>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>
        </div>

        {digest && (
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Daily Digest
            </h2>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {digest}
            </div>
          </div>
        )}

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">Games</h2>
            <Suspense fallback={null}>
              <GamesFilter sports={sports} />
            </Suspense>
          </div>
          <Suspense fallback={<LoadingSkeleton />}>
            <GamesGrid searchParams={searchParams} />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
