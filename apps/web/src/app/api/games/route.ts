import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@edgeiq/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_SORT_FIELDS = ["commenceTime", "homeTeam", "awayTeam", "sport"] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const sport = searchParams.get("sport") || undefined;
  const team = searchParams.get("team") || undefined;
  const sort: SortField = (VALID_SORT_FIELDS.find((f) => f === searchParams.get("sort")) ?? "commenceTime");
  const order = searchParams.get("order") === "desc" ? "desc" : "asc";
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "1", 10), 1), 7);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const where: Prisma.GameWhereInput = {
    commenceTime: { gte: start, lt: end },
    ...(sport && { sport }),
    ...(team && {
      OR: [
        { homeTeam: { contains: team, mode: "insensitive" } },
        { awayTeam: { contains: team, mode: "insensitive" } },
      ],
    }),
  };

  const games = await prisma.game.findMany({
    where,
    include: {
      oddsSnapshots: { orderBy: { capturedAt: "asc" } },
      lineMovements: { orderBy: { capturedAt: "desc" }, take: 1 },
      publicBettingData: { orderBy: { capturedAt: "desc" }, take: 1 },
      aiAnalyses: { orderBy: { generatedAt: "desc" }, take: 1 },
    },
    orderBy: { [sort]: order },
  });

  return NextResponse.json(games);
}
