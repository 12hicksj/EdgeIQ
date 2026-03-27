"use client";

import type { Bet, Game } from "@edgeiq/db";
import { roiSummary, closingLineValue } from "@edgeiq/models";

interface BetTrackerProps {
  bets: Array<Bet & { game: Game }>;
}

function ResultBadge({ result }: { result: string }) {
  const styles: Record<string, string> = {
    WIN: "bg-green-900 text-green-300",
    LOSS: "bg-red-900 text-red-300",
    PUSH: "bg-gray-700 text-gray-300",
    PENDING: "bg-yellow-900 text-yellow-300",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${styles[result] ?? styles.PENDING}`}
    >
      {result}
    </span>
  );
}

export function BetTracker({ bets }: BetTrackerProps) {
  const summary = roiSummary(bets);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-white font-semibold">Bet Tracker</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              {[
                "Game",
                "Market",
                "Side",
                "Odds",
                "Units",
                "Result",
                "CLV",
                "Placed",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-gray-400 font-medium text-xs"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {bets.map((bet) => {
              const clv =
                bet.closingOdds !== null
                  ? closingLineValue(bet.odds, bet.closingOdds)
                  : null;
              return (
                <tr key={bet.id} className="hover:bg-gray-800/50">
                  <td className="px-3 py-2 text-white text-xs">
                    {bet.game.awayTeam} @ {bet.game.homeTeam}
                  </td>
                  <td className="px-3 py-2 text-gray-300 text-xs">
                    {bet.market}
                  </td>
                  <td className="px-3 py-2 text-gray-300 text-xs">
                    {bet.side}
                  </td>
                  <td className="px-3 py-2 text-gray-300 text-xs">
                    {bet.odds > 0 ? "+" : ""}
                    {bet.odds}
                  </td>
                  <td className="px-3 py-2 text-gray-300 text-xs">
                    {bet.units}u
                  </td>
                  <td className="px-3 py-2">
                    <ResultBadge result={bet.result} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {clv !== null ? (
                      <span
                        className={
                          clv >= 0 ? "text-green-400" : "text-red-400"
                        }
                      >
                        {clv >= 0 ? "+" : ""}
                        {clv.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">
                    {new Date(bet.placedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {bets.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-gray-500 text-xs"
                >
                  No bets tracked yet.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-800 border-t border-gray-700">
            <tr>
              <td
                colSpan={4}
                className="px-3 py-2 text-gray-400 text-xs font-medium"
              >
                TOTALS: {summary.totalBets} bets | {summary.wins}W-
                {summary.losses}L-{summary.pushes}P
              </td>
              <td className="px-3 py-2 text-gray-300 text-xs">
                {summary.totalUnitsWagered.toFixed(1)}u
              </td>
              <td />
              <td className="px-3 py-2 text-xs">
                <span
                  className={
                    summary.roi >= 0 ? "text-green-400" : "text-red-400"
                  }
                >
                  ROI: {summary.roi >= 0 ? "+" : ""}
                  {summary.roi.toFixed(1)}%
                </span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
