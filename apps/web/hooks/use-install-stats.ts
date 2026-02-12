"use client";

import { useState, useEffect, useRef } from "react";

interface SkillInstallStats {
  skill_name: string;
  total_installs: number;
  last_install_at: string | null;
}

// In-memory cache shared across hook instances
let statsCache: Map<string, number> | null = null;
let statsCacheTimestamp = 0;
const STATS_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Non-blocking hook to fetch install stats for all skills.
 * Returns a Map of skill_name → total_installs.
 * Loads independently from skills list so it never blocks page render.
 */
export function useInstallStats() {
  const [stats, setStats] = useState<Map<string, number>>(
    statsCache ?? new Map()
  );
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Return cached data immediately if fresh
    if (statsCache && Date.now() - statsCacheTimestamp < STATS_CACHE_TTL) {
      setStats(statsCache);
      return;
    }

    // Fetch in background — non-blocking
    fetch("/api/analytics/install?all=true")
      .then((res) => res.json())
      .then((data) => {
        const map = new Map<string, number>();
        const skills: SkillInstallStats[] = data.skills || [];
        for (const s of skills) {
          if (s.total_installs > 0) {
            map.set(s.skill_name, s.total_installs);
          }
        }
        statsCache = map;
        statsCacheTimestamp = Date.now();
        setStats(map);
      })
      .catch(() => {
        // Silent failure — install counts are optional UI
      });
  }, []);

  return stats;
}
