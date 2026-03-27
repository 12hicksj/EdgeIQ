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

const REC_STYLES = {
  STRONG_BET: { badge: "bg-green-900 text-green-300 border border-green-700", label: "STRONG BET" },
  LEAN: { badge: "bg-yellow-900 text-yellow-300 border border-yellow-700", label: "LEAN" },
  PASS: { badge: "bg-gray-800 text-gray-400 border border-gray-600", label: "PASS" },
};

function fmt(odds: number) {
  return `${odds > 0 ? "+" : ""}${odds}`;
}

export function GameCard({ game, odds, lineMovement, publicBetting, aiAnalysis }: GameCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const edgeScore = aiAnalysis?.edgeScore ?? 0;
  const rec = (aiAnalysis?.recommendation ?? "PASS") as keyof typeof REC_STYLES;
  const recStyle = REC_STYLES[rec];

  const betSideMatch = aiAnalysis?.summary?.match(/^(Home|Away):\s*[^—–-]+/i);
  const betSide = betSideMatch ? betSideMatch[0].trim() : null;
  const summaryBody = betSideMatch
    ? aiAnalysis!.summary.replace(betSideMatch[0], "").replace(/^[\s—–-]+/, "")
    : aiAnalysis?.summary ?? "";

  const keyFactors: string[] = aiAnalysis?.keyFactors ? JSON.parse(aiAnalysis.keyFactors) : [];

  const latestByMarket = odds.reduceRight<Record<string, OddsSnapshot>>((acc, snap) => {
    if (!acc[snap.market]) acc[snap.market] = snap;
    return acc;
  }, {});
  const h2h = latestByMarket["h2h"];
  const spread = latestByMarket["spreads"];
  const total = latestByMarket["totals"];

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden flex flex-col">
      <div className="px-4 py-3 bg-gray-800">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{game.sportTitle || game.sport}</p>
        <h3 className="text-white font-semibold text-sm mt-0.5">
          {game.awayTeam} <span className="text-gray-400">@</span> {game.homeTeam}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {new Date(game.commenceTime).toLocaleString([], {
            weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
          })}
        </p>
      </div>

      <div className="p-4 space-y-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <EdgeScoreGauge score={edgeScore} />
          <div className="flex-1 min-w-0">
            {aiAnalysis ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${recStyle.badge}`}>
                    {recStyle.label}
                  </span>
                  {lineMovement?.isSharp && (
                    <span className="text-orange-400 text-xs font-medium">⚡ Sharp</span>
                  )}
                </div>
                {betSide && rec !== "PASS" && (
                  <p className="text-white font-semibold text-sm mb-1">{betSide}</p>
                )}
                <p className="text-gray-400 text-xs leading-relaxed line-clamp-3">{summaryBody}</p>
              </>
            ) : (
              <p className="text-gray-600 text-xs italic mt-2">Analyzing…</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-gray-800 rounded p-2">
            <p className="text-gray-500 mb-1 font-medium">Moneyline</p>
            {h2h ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Home</span>
                  <span className="text-white font-mono">{fmt(h2h.homeOdds)}</span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-gray-400">Away</span>
                  <span className="text-white font-mono">{fmt(h2h.awayOdds)}</span>
                </div>
              </>
            ) : <p className="text-gray-600">—</p>}
          </div>

          <div className="bg-gray-800 rounded p-2">
            <p className="text-gray-500 mb-1 font-medium">Spread</p>
            {spread ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Home</span>
                  <span className="text-white font-mono">
                    {spread.spread !== null ? (spread.spread > 0 ? "+" : "") + spread.spread : "—"}
                  </span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-gray-500 text-[10px]">vig</span>
                  <span className="text-gray-500 font-mono text-[10px]">{fmt(spread.homeOdds)}/{fmt(spread.awayOdds)}</span>
                </div>
              </>
            ) : <p className="text-gray-600">—</p>}
          </div>

          <div className="bg-gray-800 rounded p-2">
            <p className="text-gray-500 mb-1 font-medium">Total</p>
            {total ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">O/U</span>
                  <span className="text-white font-mono">{total.total ?? "—"}</span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-gray-500 text-[10px]">vig</span>
                  <span className="text-gray-500 font-mono text-[10px]">{fmt(total.homeOdds)}/{fmt(total.awayOdds)}</span>
                </div>
              </>
            ) : <p className="text-gray-600">—</p>}
          </div>
        </div>

        <LineMovementChart snapshots={odds} />

        {keyFactors.length > 0 && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>{showDetails ? "▲" : "▼"}</span>
              <span>Key Factors</span>
            </button>
            {showDetails && (
              <ul className="mt-2 space-y-1">
                {keyFactors.map((f, i) => (
                  <li key={i} className="text-xs text-gray-400 flex gap-1.5">
                    <span className="text-blue-500 shrink-0">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
