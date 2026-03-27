"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { OddsSnapshot } from "@edgeiq/db";

interface LineMovementChartProps {
  snapshots: OddsSnapshot[];
}

export function LineMovementChart({ snapshots }: LineMovementChartProps) {
  const spreadSnaps = snapshots
    .filter((s) => s.market === "spreads" && s.spread !== null)
    .slice(-40);

  if (spreadSnaps.length < 2) return null;

  // Deduplicate by minute — keep last snapshot per minute
  const byMinute = new Map<string, (typeof spreadSnaps)[0]>();
  for (const s of spreadSnaps) {
    const key = new Date(s.capturedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    byMinute.set(key, s);
  }

  const data = Array.from(byMinute.entries()).map(([time, s]) => ({
    time,
    spread: s.spread,
  }));

  if (data.length < 2) return null;

  const spreads = data.map((d) => d.spread as number);
  const minSpread = Math.min(...spreads);
  const maxSpread = Math.max(...spreads);
  const moved = Math.abs(maxSpread - minSpread) >= 0.5;

  const mid = (minSpread + maxSpread) / 2;
  const halfRange = Math.max(2, (maxSpread - minSpread) / 2 + 0.5);
  const domainMin = Math.round((mid - halfRange) * 2) / 2;
  const domainMax = Math.round((mid + halfRange) * 2) / 2;

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded p-2 text-xs">
          <p className="text-gray-400">{label}</p>
          <p className="text-white">
            Home {val > 0 ? "+" : ""}
            {val}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">
        Spread Movement{" "}
        {moved && <span className="text-orange-400">(line moved)</span>}
      </p>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#6b7280", fontSize: 9 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#6b7280", fontSize: 9 }}
              reversed
              domain={[domainMin, domainMax]}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 2" />
            <Line
              type="monotone"
              dataKey="spread"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
