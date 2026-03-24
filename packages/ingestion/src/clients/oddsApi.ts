import axios from "axios";

const BASE_URL = "https://api.the-odds-api.com/v4";
const API_KEY = process.env.ODDS_API_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  params: {
    apiKey: API_KEY,
  },
});

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

/**
 * Get list of active sports
 */
export async function getSports(): Promise<Sport[]> {
  const response = await client.get<Sport[]>("/sports", {
    params: { all: false },
  });
  return response.data;
}

/**
 * Get odds for all games in a sport
 */
export async function getOdds(
  sport: string,
  markets: string[]
): Promise<OddsGame[]> {
  const response = await client.get<OddsGame[]>(`/sports/${sport}/odds`, {
    params: {
      regions: "us",
      markets: markets.join(","),
      oddsFormat: "american",
    },
  });
  return response.data;
}

/**
 * Get completed game scores for a sport
 */
export async function getScores(sport: string): Promise<ScoreGame[]> {
  const response = await client.get<ScoreGame[]>(
    `/sports/${sport}/scores`,
    {
      params: { daysFrom: 1 },
    }
  );
  return response.data;
}
