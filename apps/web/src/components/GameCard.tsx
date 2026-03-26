"use client";

import { useState } from "react";
import type { Game, OddsSnapshot, PublicBettingData, AIAnalysis } from "@edgeiq/db";
import type { LineMovementResult } from "@edgeiq/models";
import { EdgeScoreGauge } from "./EdgeScoreGauge";
import { LineMovementChart } from "./LineMovementChart";

interface GameCardProps {
  game: Game;
  odds: OddsSnapshot[];
  lineMovement: LineMovementResult | null;
  publicBetting: PublicBettingData | null;
  aiAnalysis: AIAnalysis | null;
}

function RecommendationBadge({ rec }: { rec: string }) {
  const styles: Record<string, string> = {
    STRONG_BET: "bg-green-900 text-green-300 border border-green-700",
    LEAN: "bg-yellow-900 text-yellow-300 border border-yellow-700",
    PASS: "bg-gray-800 text-gray-400 border border-gray-600",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${styles[rec] ?? styles.PASS}`}
    >
      {rec.replace("_", " ")}
    </span>
  );
}

export function GameCard({
  game,
  odds,
  lineMovement,
  publicBetting,
  aiAnalysis,
}: GameCardProps) {
  const [expanded, setExpanded] = useState(false);
  const latestOdds = odds[odds.length - 1];
  const edgeScore = aiAnalysis?.edgeScore ?? 0;

  const keyFactors: string[] = aiAnalysis?.keyFactors
    ? JSON.parse(aiAnalysis.keyFactors)
    : [];

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            {game.sport}
          </p>
          <h3 className="text-white font-semibold text-sm">
            {game.awayTeam} <span className="text-gray-400">@</span>{" "}
            {game.homeTeam}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(game.commenceTime).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {aiAnalysis && (
            <RecommendationBadge rec={aiAnalysis.recommendation} />
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Edge score + odds row */}
        <div className="flex items-center gap-4">
          <EdgeScoreGauge score={edgeScore} />
          {latestOdds && (
            <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-800 rounded p-2">
                <p className="text-gray-400">Home</p>
                <p className="text-white font-mono">
                  {latestOdds.homeOdds > 0 ? "+" : ""}
                  {latestOdds.homeOdds}
                </p>
              </div>
              <div className="bg-gray-800 rounded p-2">
                <p className="text-gray-400">Away</p>
                <p className="text-white font-mono">
                  {latestOdds.awayOdds > 0 ? "+" : ""}
                  {latestOdds.awayOdds}
                </p>
              </div>
              {lineMovement && lineMovement.openingSpread !== null && (
                <>
                  <div className="bg-gray-800 rounded p-2">
                    <p className="text-gray-400">Open</p>
                    <p className="text-white font-mono">
                      {lineMovement.openingSpread > 0 ? "+" : ""}
                      {lineMovement.openingSpread}
                    </p>
                  </div>
                  <div className="bg-gray-800 rounded p-2">
                    <p className="text-gray-400">
                      Current{" "}
                      {lineMovement.isSharp && (
                        <span className="text-orange-400">⚡</span>
                      )}
                    </p>
                    <p className="text-white font-mono">
                      {(lineMovement.currentSpread ?? 0) > 0 ? "+" : ""}
                      {lineMovement.currentSpread}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Public betting bars */}
        {publicBetting && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium">Public Betting</p>
            {[
              {
                label: "Tickets",
                home: publicBetting.homeTicketPct,
                away: publicBetting.awayTicketPct,
              },
              {
                label: "Money",
                home: publicBetting.homeMoneyPct,
                away: publicBetting.awayMoneyPct,
              },
            ].map(({ label, home, away }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                  <span>
                    {game.homeTeam.split(" ").pop()} {home.toFixed(0)}%
                  </span>
                  <span className="text-gray-400">{label}</span>
                  <span>
                    {away.toFixed(0)}% {game.awayTeam.split(" ").pop()}
                  </span>
                </div>
                <div className="flex h-2 rounded overflow-hidden bg-gray-700">
                  <div
                    className="bg-blue-500"
                    style={{ width: `${home}%` }}
                  />
                  <div
                    className="bg-amber-500"
                    style={{ width: `${away}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Odds history chart */}
        {odds.length > 1 && <LineMovementChart snapshots={odds} />}

        {/* Expandable AI analysis */}
        {aiAnalysis && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full text-left text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>{expanded ? "▲" : "▼"}</span>
              <span>AI Analysis</span>
            </button>
            {expanded && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-300 leading-relaxed">
                  {aiAnalysis.summary}
                </p>
                {keyFactors.length > 0 && (
                  <ul className="space-y-1">
                    {keyFactors.map((f, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-400 flex gap-1"
                      >
                        <span className="text-blue-500">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
