"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface SkillListItem {
  name: string;
  url: string;
  command: string;
  metadata: {
    sourceUrl: string | null;
    generatedAt: string;
    updatedAt: string;
  } | null;
}

interface CacheEntry {
  skills: SkillListItem[];
  timestamp: number;
}

const CACHE_KEY = "txtskills:skills-cache";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache shared across hook instances (survives re-renders, not page reloads)
let memoryCache: CacheEntry | null = null;

function readLocalCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(skills: SkillListItem[]) {
  const entry: CacheEntry = { skills, timestamp: Date.now() };
  memoryCache = entry;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — memory cache still works
  }
}

/** Invalidate the skills cache (call after publishing a new skill) */
export function invalidateSkillsCache() {
  memoryCache = null;
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
  
  // Also invalidate server-side cache
  fetch('/api/skills', { method: 'POST' }).catch(() => {});
}

/** Smart skills fetcher — returns cached data instantly and only refetches when stale */
export function useSkillsCache() {
  const [skills, setSkills] = useState<SkillListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const fetchSkills = useCallback(async (force = false) => {
    // Check memory cache first (fastest)
    if (!force && memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL) {
      setSkills(memoryCache.skills);
      setLoading(false);
      return;
    }

    // Check localStorage (survives page reloads)
    if (!force) {
      const local = readLocalCache();
      if (local) {
        memoryCache = local;
        setSkills(local.skills);
        setLoading(false);
        return;
      }
    }

    // Cache miss or forced — fetch from API
    setLoading(true);
    try {
      const res = await fetch("/api/skills");
      const data = await res.json();
      const fetched: SkillListItem[] = data.skills || [];
      writeCache(fetched);
      setSkills(fetched);
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount (only once)
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchSkills();
    }
  }, [fetchSkills]);

  return { skills, loading, refetch: () => fetchSkills(true) };
}
