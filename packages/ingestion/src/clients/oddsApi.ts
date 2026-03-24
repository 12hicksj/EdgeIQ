import axios, { AxiosResponse } from "axios";

// Primary host. IPv6-capable connections can use ipv6-api.the-odds-api.com
const BASE_URL = "https://api.the-odds-api.com/v4";

const client = axios.create({ baseURL: BASE_URL });

// Retry once on 429 with a 5-second backoff
client.interceptors.response.use(undefined, async (error) => {
  if (error.response?.status === 429 && !error.config._retried) {
    error.config._retried = true;
    await new Promise((r) => setTimeout(r, 5000));
    return client.request(error.config);
  }
  return Promise.reject(error);
});

function apiKey(): string {
  const key = process.env.ODDS_API_KEY;
  if (!key) throw new Error("ODDS_API_KEY env var is not set");
  return key;
}

export interface Sport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  has_outrights: boolean;
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
  description?: string;
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface OddsGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface GameEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
}

export interface ScoreGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
  last_update: string | null;
}

export interface RateLimitInfo {
  requestsRemaining: number;
  requestsUsed: number;
  requestsLast: number;
}

export interface OddsResponse {
  games: OddsGame[];
  rateLimit: RateLimitInfo;
}

function extractRateLimit(res: AxiosResponse): RateLimitInfo {
  return {
    requestsRemaining: parseInt(res.headers["x-requests-remaining"] ?? "0", 10),
    requestsUsed: parseInt(res.headers["x-requests-used"] ?? "0", 10),
    requestsLast: parseInt(res.headers["x-requests-last"] ?? "0", 10),
  };
}

/**
 * Get list of sports. FREE — does not count against quota.
 */
export async function getSports(all = false): Promise<Sport[]> {
  const response = await client.get<Sport[]>("/sports", {
    params: { apiKey: apiKey(), all },
  });
  return response.data;
}

/**
 * Get upcoming/in-play events without odds. FREE — does not count against quota.
 * Use sport="upcoming" to get the next 8 games across all sports.
 */
export async function getEvents(
  sport: string,
  options: { commenceTimeFrom?: string; commenceTimeTo?: string; eventIds?: string } = {}
): Promise<GameEvent[]> {
  const params: Record<string, string> = { apiKey: apiKey(), dateFormat: "iso" };
  if (options.commenceTimeFrom) params.commenceTimeFrom = options.commenceTimeFrom;
  if (options.commenceTimeTo) params.commenceTimeTo = options.commenceTimeTo;
  if (options.eventIds) params.eventIds = options.eventIds;
  const response = await client.get<GameEvent[]>(`/sports/${sport}/events`, { params });
  return response.data;
}

/**
 * Get odds for all upcoming/live games in a sport.
 * Quota cost = markets x regions (e.g. h2h+spreads+totals x us = 3 credits).
 * commenceTimeFrom/To filters have no effect when sport="upcoming".
 */
export async function getOdds(
  sport: string,
  markets: string[],
  options: { bookmakers?: string; commenceTimeFrom?: string; commenceTimeTo?: string; eventIds?: string } = {}
): Promise<OddsResponse> {
  const params: Record<string, string> = {
    apiKey: apiKey(),
    regions: "us",
    markets: markets.join(","),
    oddsFormat: "american",
    dateFormat: "iso",
  };
  if (options.bookmakers) params.bookmakers = options.bookmakers;
  if (options.commenceTimeFrom) params.commenceTimeFrom = options.commenceTimeFrom;
  if (options.commenceTimeTo) params.commenceTimeTo = options.commenceTimeTo;
  if (options.eventIds) params.eventIds = options.eventIds;
  const response = await client.get<OddsGame[]>(`/sports/${sport}/odds`, { params });
  return { games: response.data, rateLimit: extractRateLimit(response) };
}

/**
 * Get odds for a single event. Supports any market key including props.
 * Quota cost = unique markets returned x regions.
 */
export async function getEventOdds(
  sport: string,
  eventId: string,
  markets: string[]
): Promise<OddsResponse> {
  const response = await client.get<OddsGame>(
    `/sports/${sport}/events/${eventId}/odds`,
    {
      params: {
        apiKey: apiKey(),
        regions: "us",
        markets: markets.join(","),
        oddsFormat: "american",
        dateFormat: "iso",
      },
    }
  );
  return { games: [response.data], rateLimit: extractRateLimit(response) };
}

/**
 * Get scores for upcoming, live, and recently completed games.
 * Quota cost: 1 without daysFrom, 2 with daysFrom (1-3 days back).
 */
export async function getScores(
  sport: string,
  daysFrom?: 1 | 2 | 3,
  eventIds?: string
): Promise<ScoreGame[]> {
  const params: Record<string, string | number> = { apiKey: apiKey(), dateFormat: "iso" };
  if (daysFrom !== undefined) params.daysFrom = daysFrom;
  if (eventIds) params.eventIds = eventIds;
  const response = await client.get<ScoreGame[]>(`/sports/${sport}/scores`, { params });
  return response.data;
}
