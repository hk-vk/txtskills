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
  version: string | number;
}

const CACHE_KEY = "txtskills:skills-cache";
const CACHE_VERSION_KEY = "txtskills:cache-version";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache shared across hook instances
let memoryCache: CacheEntry | null = null;
let lastKnownVersion: string | number | null = null;

function readLocalCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_VERSION_KEY);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(skills: SkillListItem[], version: string | number) {
  const entry: CacheEntry = { skills, timestamp: Date.now(), version };
  memoryCache = entry;
  lastKnownVersion = version;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    localStorage.setItem(CACHE_VERSION_KEY, String(version));
  } catch {
    // localStorage full or unavailable
  }
}

/** Invalidate the skills cache (call after publishing a new skill) */
export function invalidateSkillsCache() {
  memoryCache = null;
  lastKnownVersion = null;
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_VERSION_KEY);
  } catch {}
  
  // Invalidate server-side cache
  fetch('/api/skills', { method: 'POST' }).catch(() => {});
}

/** Smart skills fetcher — returns cached data and checks for updates */
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
        lastKnownVersion = local.version;
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
      const version = data._v || Date.now();
      
      writeCache(fetched, version);
      setSkills(fetched);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
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
