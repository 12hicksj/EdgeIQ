import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@edgeiq/db";
import { analyzeGame } from "@edgeiq/ai";
import { detectLineMovement, detectReverseLineMovement } from "@edgeiq/models";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const { gameId } = params;

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      oddsSnapshots: { orderBy: { capturedAt: "asc" } },
      publicBettingData: { orderBy: { capturedAt: "desc" }, take: 1 },
    },
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const latestOdds = [...game.oddsSnapshots].reverse().find((s) => s.market === "h2h");
  if (!latestOdds) {
    return NextResponse.json({ error: "No odds data" }, { status: 422 });
  }

  const lineMovement = detectLineMovement(game.oddsSnapshots);
  const publicBetting = game.publicBettingData[0] ?? null;
  if (publicBetting) {
    lineMovement.isSharp = detectReverseLineMovement(publicBetting, lineMovement);
  }

  const analysis = await analyzeGame({ game, latestOdds, lineMovement, snapshotCount: game.oddsSnapshots.length, publicBetting });

  return NextResponse.json(analysis, { status: 201 });
}
