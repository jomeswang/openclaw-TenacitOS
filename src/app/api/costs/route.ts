import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import {
  getDatabase,
  getCostSummary,
  getCostByAgent,
  getCostByModel,
  getDailyCost,
  getHourlyCost,
} from "@/lib/usage-queries";
import { collectUsage } from "@/lib/usage-collector";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "usage-tracking.db");
const DEFAULT_BUDGET = 100.0; // Default budget in USD

function dbIsFresh(dbPath: string): boolean {
  try {
    if (!fs.existsSync(dbPath)) return false;
    const stat = fs.statSync(dbPath);
    return Date.now() - stat.mtimeMs < 10 * 60 * 1000;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timeframe = searchParams.get("timeframe") || "30d";

  // Parse timeframe to days
  const days = parseInt(timeframe.replace(/\D/g, ""), 10) || 30;

  try {
    if (!dbIsFresh(DB_PATH)) {
      try {
        await collectUsage(DB_PATH);
      } catch (collectError) {
        console.error("Failed to collect usage before serving costs:", collectError);
      }
    }

    const db = getDatabase(DB_PATH);

    if (!db) {
      return NextResponse.json({
        today: 0,
        yesterday: 0,
        thisMonth: 0,
        lastMonth: 0,
        projected: 0,
        budget: DEFAULT_BUDGET,
        byAgent: [],
        byModel: [],
        daily: [],
        hourly: [],
        message: "No usage data available yet.",
      });
    }

    const summary = getCostSummary(db);
    const byAgent = getCostByAgent(db, days);
    const byModel = getCostByModel(db, days);
    const daily = getDailyCost(db, days);
    const hourly = getHourlyCost(db);

    db.close();

    return NextResponse.json({
      ...summary,
      budget: DEFAULT_BUDGET,
      byAgent,
      byModel,
      daily,
      hourly,
      source: "openclaw-status+sqlite-cache",
      collected: true,
    });
  } catch (error) {
    console.error("Error fetching cost data:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost data" },
      { status: 500 }
    );
  }
}

// POST endpoint to update budget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { budget, alerts } = body;

    // In production, save to database
    // For now, just return success
    
    return NextResponse.json({
      success: true,
      budget,
      alerts,
    });
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget" },
      { status: 500 }
    );
  }
}
