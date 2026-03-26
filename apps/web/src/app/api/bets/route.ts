import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@edgeiq/db";

export async function GET() {
  const bets = await prisma.bet.findMany({
    include: { game: true },
    orderBy: { placedAt: "desc" },
  });
  return NextResponse.json(bets);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const bet = await prisma.bet.create({
    data: {
      gameId: body.gameId,
      market: body.market,
      side: body.side,
      odds: body.odds,
      units: body.units,
      notes: body.notes,
    },
    include: { game: true },
  });

  return NextResponse.json(bet, { status: 201 });
}
