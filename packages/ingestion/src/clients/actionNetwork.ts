import axios from "axios";

// NOTE: Action Network does not have a fully documented public API.
// This client is a placeholder — substitute real endpoint or scraping logic
// based on actual Action Network data access (e.g. via their betting data API
// at https://api.actionnetwork.com or web scraping their public game pages).

const BASE_URL =
  process.env.ACTION_NETWORK_BASE_URL || "https://api.actionnetwork.com";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface PublicBettingInfo {
  homeTicketPct: number;
  awayTicketPct: number;
  homeMoneyPct: number;
  awayMoneyPct: number;
}

/**
 * Get public betting percentages for a game
 * NOTE: Replace this implementation with real Action Network endpoint
 * or scraping logic once you have access credentials/endpoints.
 */
export async function getPublicBetting(
  gameId: string
): Promise<PublicBettingInfo> {
  // Placeholder: In production, call the real Action Network API endpoint
  // e.g. GET /games/{gameId}/betting-percentages
  const response = await client.get<PublicBettingInfo>(
    `/games/${gameId}/betting-percentages`
  );
  return response.data;
}
