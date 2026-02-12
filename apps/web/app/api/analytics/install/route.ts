import { NextRequest, NextResponse } from "next/server";
import {
  trackInstallEvent,
  getSkillStats,
  getTopSkills,
  getAllSkillStats,
} from "@/lib/db";

interface InstallEvent {
  skillName: string;
  cliVersion?: string;
  platform?: string; // linux, darwin, win32
  nodeVersion?: string;
}

/**
 * POST /api/analytics/install
 * Track a skill installation event
 */
export async function POST(request: NextRequest) {
  try {
    const body: InstallEvent = await request.json();
    const { skillName, cliVersion, platform, nodeVersion } = body;

    if (!skillName) {
      return NextResponse.json(
        { error: "skillName is required" },
        { status: 400 }
      );
    }

    // Track the installation event
    await trackInstallEvent({
      skillName,
      cliVersion: cliVersion || null,
      platform: platform || null,
      nodeVersion: nodeVersion || null,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error("[Analytics] Error tracking install:", error);
    // Always return 200 - don't break client installations
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 200 }
    );
  }
}

/**
 * GET /api/analytics/install
 * Query installation statistics
 *
 * Query params:
 * - skill: Get stats for a specific skill
 * - limit: Limit results (default: 50)
 * - sort: Sort by 'installs' (default) or 'recent'
 *
 * Examples:
 * - /api/analytics/install?skill=ai-sdk
 * - /api/analytics/install?limit=10
 * - /api/analytics/install?sort=recent&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skillName = searchParams.get("skill");
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sort = searchParams.get("sort") || "installs"; // 'installs' or 'recent'

    // Get stats for specific skill
    if (skillName) {
      const stats = await getSkillStats(skillName);
      return NextResponse.json(stats || {
        skill_name: skillName,
        total_installs: 0,
        last_install_at: null,
      });
    }

    // Get all skills with stats
    if (searchParams.get("all") === "true") {
      const allStats = await getAllSkillStats();
      return NextResponse.json({ skills: allStats });
    }

    // Get top skills (default behavior)
    const topSkills = await getTopSkills(Math.min(limit, 100), sort as "installs" | "recent");

    return NextResponse.json({
      skills: topSkills,
      count: topSkills.length,
      sort,
    });
  } catch (error: any) {
    console.error("[Analytics] Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: error.message },
      { status: 500 }
    );
  }
}
