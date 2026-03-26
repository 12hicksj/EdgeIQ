"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { OddsSnapshot } from "@edgeiq/db";

interface LineMovementChartProps {
  snapshots: OddsSnapshot[];
}

interface ChartDataPoint {
  time: string;
  homeOdds: number;
  awayOdds: number;
  bookmaker: string;
}

export function LineMovementChart({ snapshots }: LineMovementChartProps) {
  const data: ChartDataPoint[] = snapshots.map((s) => ({
    time: new Date(s.capturedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    homeOdds: s.homeOdds,
    awayOdds: s.awayOdds,
    bookmaker: s.bookmaker,
  }));

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; payload: ChartDataPoint }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-600 rounded p-2 text-xs">
          <p className="text-gray-400">{label}</p>
          <p className="text-gray-400">
            Book: {payload[0]?.payload.bookmaker}
          </p>
          {payload.map((p) => (
            <p key={p.name} className="text-white">
              {p.name}: {p.value > 0 ? "+" : ""}
              {p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 10 }} />
          <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px", color: "#9ca3af" }}
          />
          <Line
            type="monotone"
            dataKey="homeOdds"
            name="Home"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="awayOdds"
            name="Away"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
