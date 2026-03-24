import { NextResponse } from "next/server";
import { prisma } from "@betting/db";

export async function GET() {
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
      oddsSnapshots: {
        orderBy: { capturedAt: "asc" },
      },
      lineMovements: {
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
      publicBettingData: {
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
      aiAnalyses: {
        orderBy: { generatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { commenceTime: "asc" },
  });

  return NextResponse.json(games);
}
