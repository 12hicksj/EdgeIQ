import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn("ANTHROPIC_API_KEY is not set");
}

/** Singleton Anthropic client */
export const anthropic = new Anthropic({ apiKey });

export const MODEL = "claude-sonnet-4-20250514";
