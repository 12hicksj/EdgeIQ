import { Suspense } from "react";
import { prisma } from "@betting/db";
import { generateDailyDigest } from "@betting/ai";
import { GameCard } from "@/components/GameCard";
import { BetTracker } from "@/components/BetTracker";
import { detectLineMovement, detectReverseLineMovement } from "@betting/models";
import type { LineMovementResult } from "@betting/models";

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
        <div
          key={i}
          className="bg-gray-900 rounded-lg border border-gray-700 h-64 animate-pulse"
        />
      ))}
    </div>
  );
}

async function GamesGrid() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const games = await prisma.game.findMany({
    where: {
      commenceTime: {
        gte: today,
        lt: tomorrow,
      },
    },
    include: {
      oddsSnapshots: { orderBy: { capturedAt: "asc" } },
      publicBettingData: { orderBy: { capturedAt: "desc" }, take: 1 },
      aiAnalyses: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
    orderBy: { commenceTime: "asc" },
  });

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No games scheduled for today.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((game) => {
        const lineMovement: LineMovementResult = detectLineMovement(
          game.oddsSnapshots
        );
        const publicBetting = game.publicBettingData[0] ?? null;
        if (publicBetting) {
          lineMovement.isSharp = detectReverseLineMovement(
            publicBetting,
            lineMovement
          );
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

async function BetsSection() {
  const bets = await prisma.bet.findMany({
    include: { game: true },
    orderBy: { placedAt: "desc" },
  });
  return <BetTracker bets={bets} />;
}

export default async function DashboardPage() {
  const digest = await getDailyDigest();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              EdgeIQ
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Daily digest */}
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

        {/* Today's games */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">
            Today&apos;s Games
          </h2>
          <Suspense fallback={<LoadingSkeleton />}>
            <GamesGrid />
          </Suspense>
        </section>

        {/* Bet tracker */}
        <section>
          <Suspense
            fallback={
              <div className="h-32 bg-gray-900 rounded-lg border border-gray-700 animate-pulse" />
            }
          >
            <BetsSection />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
