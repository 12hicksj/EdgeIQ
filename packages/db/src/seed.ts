import { PrismaClient, GameStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create 3 sample NFL games
  const game1 = await prisma.game.upsert({
    where: { externalId: "nfl_game_001" },
    update: {},
    create: {
      externalId: "nfl_game_001",
      sport: "americanfootball_nfl",
      homeTeam: "Kansas City Chiefs",
      awayTeam: "Buffalo Bills",
      commenceTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      status: GameStatus.SCHEDULED,
    },
  });

  const game2 = await prisma.game.upsert({
    where: { externalId: "nfl_game_002" },
    update: {},
    create: {
      externalId: "nfl_game_002",
      sport: "americanfootball_nfl",
      homeTeam: "San Francisco 49ers",
      awayTeam: "Dallas Cowboys",
      commenceTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      status: GameStatus.SCHEDULED,
    },
  });

  const game3 = await prisma.game.upsert({
    where: { externalId: "nfl_game_003" },
    update: {},
    create: {
      externalId: "nfl_game_003",
      sport: "americanfootball_nfl",
      homeTeam: "Philadelphia Eagles",
      awayTeam: "New York Giants",
      commenceTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
      status: GameStatus.SCHEDULED,
    },
  });

  // Create odds snapshots for game1
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  await prisma.oddsSnapshot.createMany({
    data: [
      {
        gameId: game1.id,
        bookmaker: "draftkings",
        market: "spreads",
        homeOdds: -110,
        awayOdds: -110,
        spread: -3.5,
        capturedAt: twoHoursAgo,
      },
      {
        gameId: game1.id,
        bookmaker: "draftkings",
        market: "spreads",
        homeOdds: -115,
        awayOdds: -105,
        spread: -4.0,
        capturedAt: oneHourAgo,
      },
      {
        gameId: game1.id,
        bookmaker: "draftkings",
        market: "spreads",
        homeOdds: -120,
        awayOdds: -100,
        spread: -4.5,
        capturedAt: now,
      },
      {
        gameId: game2.id,
        bookmaker: "fanduel",
        market: "totals",
        homeOdds: -110,
        awayOdds: -110,
        total: 47.5,
        capturedAt: twoHoursAgo,
      },
      {
        gameId: game2.id,
        bookmaker: "fanduel",
        market: "totals",
        homeOdds: -112,
        awayOdds: -108,
        total: 47.0,
        capturedAt: now,
      },
      {
        gameId: game3.id,
        bookmaker: "betmgm",
        market: "h2h",
        homeOdds: -165,
        awayOdds: +140,
        capturedAt: now,
      },
    ],
  });

  console.log("Seeded games:", [game1.id, game2.id, game3.id]);
  console.log("Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
