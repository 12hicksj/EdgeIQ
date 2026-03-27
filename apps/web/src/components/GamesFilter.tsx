"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

interface GamesFilterProps {
  sports: { key: string; title: string }[];
}

const SORT_OPTIONS = [
  { value: "commenceTime", label: "Game Time" },
  { value: "sport", label: "Sport" },
  { value: "homeTeam", label: "Home Team" },
  { value: "awayTeam", label: "Away Team" },
];

const DAYS_OPTIONS = [
  { value: "1", label: "Today" },
  { value: "2", label: "Next 2 Days" },
  { value: "3", label: "Next 3 Days" },
  { value: "7", label: "Next 7 Days" },
];

export function GamesFilter({ sports }: GamesFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const currentSort = searchParams.get("sort") || "commenceTime";
  const currentOrder = searchParams.get("order") || "asc";
  const currentSport = searchParams.get("sport") || "";
  const currentTeam = searchParams.get("team") || "";
  const currentDays = searchParams.get("days") || "1";

  const toggleOrder = () => updateParam("order", currentOrder === "asc" ? "desc" : "asc");

  const hasFilters = currentSport || currentTeam || currentDays !== "1" || currentSort !== "commenceTime";

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className={`flex flex-wrap gap-3 items-center transition-opacity ${isPending ? "opacity-50" : ""}`}>
      <select
        value={currentSport}
        onChange={(e) => updateParam("sport", e.target.value)}
        className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gray-500"
      >
        <option value="">All Sports</option>
        {sports.map((s) => (
          <option key={s.key} value={s.key}>
            {s.title}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Search team..."
        defaultValue={currentTeam}
        onChange={(e) => updateParam("team", e.target.value)}
        className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 w-40"
      />

      <select
        value={currentDays}
        onChange={(e) => updateParam("days", e.target.value)}
        className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gray-500"
      >
        {DAYS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={currentSort}
        onChange={(e) => updateParam("sort", e.target.value)}
        className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gray-500"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            Sort: {opt.label}
          </option>
        ))}
      </select>

      <button
        onClick={toggleOrder}
        className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-500"
        title={currentOrder === "asc" ? "Ascending" : "Descending"}
      >
        {currentOrder === "asc" ? "↑ Asc" : "↓ Desc"}
      </button>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-sm text-gray-400 hover:text-white underline focus:outline-none"
        >
          Clear
        </button>
      )}
    </div>
  );
}
