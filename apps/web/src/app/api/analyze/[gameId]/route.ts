import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@betting/db";
import { analyzeGame } from "@betting/ai";
import { detectLineMovement, detectReverseLineMovement } from "@betting/models";

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

  const latestOdds = game.oddsSnapshots[game.oddsSnapshots.length - 1];
  if (!latestOdds) {
    return NextResponse.json({ error: "No odds data" }, { status: 422 });
  }

  const lineMovement = detectLineMovement(game.oddsSnapshots);
  const publicBetting = game.publicBettingData[0] ?? null;

  if (publicBetting) {
    lineMovement.isSharp = detectReverseLineMovement(publicBetting, lineMovement);
  }

  const edgeScore = 5; // default — real calculation done in models package

  const analysis = await analyzeGame({
    game,
    latestOdds,
    lineMovement,
    publicBetting: publicBetting!,
    edgeScore,
  });

  return NextResponse.json(analysis, { status: 201 });
}
