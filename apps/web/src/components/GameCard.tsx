"use client";

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

function abbr(teamName: string, sport: string): string {
  const words = teamName.split(" ");
  if (sport === "basketball_ncaab") {
    return words.length > 1 ? words.slice(0, -1).join(" ") : teamName;
  }
  return words[words.length - 1] ?? teamName;
}

export function GameCard({ game, odds, lineMovement, publicBetting, aiAnalysis }: GameCardProps) {
  const edgeScore = aiAnalysis?.edgeScore ?? 0;
  const rec = (aiAnalysis?.recommendation ?? "PASS") as keyof typeof REC_STYLES;
  const recStyle = REC_STYLES[rec];

  const betSideMatch = aiAnalysis?.summary?.match(/^(Home|Away):\s*[^\u2014\u2013-]+/i);
  const betSide = betSideMatch ? betSideMatch[0].trim() : null;
  const summaryBody = betSideMatch
    ? aiAnalysis!.summary.replace(betSideMatch[0], "").replace(/^[\s\u2014\u2013-]+/, "")
    : aiAnalysis?.summary ?? "";

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
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
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
                  {rec !== "PASS" && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${recStyle.badge}`}>
                      {recStyle.label}
                    </span>
                  )}
                  {lineMovement?.isSharp && (
                    <span className="text-orange-400 text-xs font-medium">⚡ Sharp</span>
                  )}
                </div>
                {betSide && (
                  <p className="text-white font-semibold text-sm mb-1">{betSide}</p>
                )}
                <p className="text-gray-400 text-xs leading-relaxed">{summaryBody}</p>
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
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-400 truncate mr-1">{abbr(game.homeTeam, game.sport)}</span>
                  <span className="text-white font-mono shrink-0">{fmt(h2h.homeOdds)}</span>
                </div>
                <div className="flex justify-between items-baseline mt-0.5">
                  <span className="text-gray-400 truncate mr-1">{abbr(game.awayTeam, game.sport)}</span>
                  <span className="text-white font-mono shrink-0">{fmt(h2h.awayOdds)}</span>
                </div>
              </>
            ) : (
              <p className="text-gray-600">—</p>
            )}
          </div>

          <div className="bg-gray-800 rounded p-2">
            <p className="text-gray-500 mb-1 font-medium">
              Spread
              {lineMovement?.isSharp && (
                <span className="text-orange-400 ml-1">⚡</span>
              )}
            </p>
            {spread ? (
              <>
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-400 truncate mr-1">{abbr(game.homeTeam, game.sport)}</span>
                  <span className="text-white font-mono shrink-0">
                    {spread.spread !== null ? (spread.spread > 0 ? "+" : "") + spread.spread : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline mt-0.5">
                  <span className="text-gray-400 truncate mr-1">{abbr(game.awayTeam, game.sport)}</span>
                  <span className="text-white font-mono shrink-0">
                    {spread.spread !== null ? (-spread.spread > 0 ? "+" : "") + -spread.spread : "—"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-gray-600">—</p>
            )}
          </div>

          <div className="bg-gray-800 rounded p-2">
            <p className="text-gray-500 mb-1 font-medium">Total</p>
            {total ? (
              <>
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-400">O/U</span>
                  <span className="text-white font-mono shrink-0">{total.total ?? "—"}</span>
                </div>
                <div className="flex justify-between items-baseline mt-0.5">
                  <span className="text-gray-500 text-[10px]">vig</span>
                  <span className="text-gray-500 font-mono text-[10px] shrink-0">
                    {fmt(total.homeOdds)}/{fmt(total.awayOdds)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-gray-600">—</p>
            )}
          </div>
        </div>

        <LineMovementChart snapshots={odds} />

        {publicBetting && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-medium">Public Betting</p>
            {[
              { label: "Tickets", home: publicBetting.homeTicketPct, away: publicBetting.awayTicketPct },
              { label: "Money", home: publicBetting.homeMoneyPct, away: publicBetting.awayMoneyPct },
            ].map(({ label, home, away }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                  <span>{abbr(game.homeTeam, game.sport)} {home.toFixed(0)}%</span>
                  <span className="text-gray-400">{label}</span>
                  <span>{away.toFixed(0)}% {abbr(game.awayTeam, game.sport)}</span>
                </div>
                <div className="flex h-2 rounded overflow-hidden bg-gray-700">
                  <div className="bg-blue-500" style={{ width: `${home}%` }} />
                  <div className="bg-amber-500" style={{ width: `${away}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
