-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINAL');

-- CreateEnum
CREATE TYPE "BetResult" AS ENUM ('PENDING', 'WIN', 'LOSS', 'PUSH');

-- CreateEnum
CREATE TYPE "AIRecommendation" AS ENUM ('STRONG_BET', 'LEAN', 'PASS');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "sportTitle" TEXT NOT NULL DEFAULT '',
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "commenceTime" TIMESTAMP(3) NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OddsSnapshot" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "bookmaker" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "homeOdds" DOUBLE PRECISION NOT NULL,
    "awayOdds" DOUBLE PRECISION NOT NULL,
    "spread" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "bookmakerUpdatedAt" TIMESTAMP(3),
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OddsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineMovement" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "openingSpread" DOUBLE PRECISION,
    "currentSpread" DOUBLE PRECISION,
    "openingTotal" DOUBLE PRECISION,
    "currentTotal" DOUBLE PRECISION,
    "openingHomeOdds" DOUBLE PRECISION,
    "currentHomeOdds" DOUBLE PRECISION,
    "movementMagnitude" DOUBLE PRECISION NOT NULL,
    "sharpIndicator" BOOLEAN NOT NULL DEFAULT false,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicBettingData" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "homeTicketPct" DOUBLE PRECISION NOT NULL,
    "awayTicketPct" DOUBLE PRECISION NOT NULL,
    "homeMoneyPct" DOUBLE PRECISION NOT NULL,
    "awayMoneyPct" DOUBLE PRECISION NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicBettingData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "units" DOUBLE PRECISION NOT NULL,
    "result" "BetResult" NOT NULL DEFAULT 'PENDING',
    "closingOdds" DOUBLE PRECISION,
    "notes" TEXT,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "edgeScore" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "keyFactors" TEXT NOT NULL,
    "recommendation" "AIRecommendation" NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_externalId_key" ON "Game"("externalId");

-- CreateIndex
CREATE INDEX "OddsSnapshot_gameId_capturedAt_idx" ON "OddsSnapshot"("gameId", "capturedAt");

-- CreateIndex
CREATE INDEX "OddsSnapshot_capturedAt_idx" ON "OddsSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "LineMovement_gameId_capturedAt_idx" ON "LineMovement"("gameId", "capturedAt");

-- CreateIndex
CREATE INDEX "LineMovement_capturedAt_idx" ON "LineMovement"("capturedAt");

-- CreateIndex
CREATE INDEX "PublicBettingData_gameId_capturedAt_idx" ON "PublicBettingData"("gameId", "capturedAt");

-- CreateIndex
CREATE INDEX "Bet_gameId_idx" ON "Bet"("gameId");

-- CreateIndex
CREATE INDEX "AIAnalysis_gameId_idx" ON "AIAnalysis"("gameId");

-- AddForeignKey
ALTER TABLE "OddsSnapshot" ADD CONSTRAINT "OddsSnapshot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineMovement" ADD CONSTRAINT "LineMovement_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicBettingData" ADD CONSTRAINT "PublicBettingData_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
