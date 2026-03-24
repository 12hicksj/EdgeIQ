import { NextResponse } from "next/server";
import { generateDailyDigest } from "@betting/ai";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const digest = await generateDailyDigest(new Date());
    return NextResponse.json({ digest });
  } catch (error) {
    console.error("Failed to generate daily digest:", error);
    return NextResponse.json({ digest: null }, { status: 500 });
  }
}
