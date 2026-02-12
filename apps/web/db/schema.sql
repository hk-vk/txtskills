-- Skills metadata table
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  source_url TEXT,
  github_url TEXT NOT NULL,
  install_command TEXT NOT NULL,
  content_hash TEXT,
  generator_version TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_source_url ON skills(source_url);

-- ============================================================================
-- Analytics Tables
-- ============================================================================

-- Detailed installation events (raw data)
CREATE TABLE IF NOT EXISTS skill_installs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL,
  installed_at TEXT DEFAULT (datetime('now')),
  cli_version TEXT,
  os_platform TEXT,  -- linux, darwin, win32
  node_version TEXT
);

CREATE INDEX IF NOT EXISTS idx_skill_installs_name ON skill_installs(skill_name);
CREATE INDEX IF NOT EXISTS idx_skill_installs_date ON skill_installs(installed_at);
CREATE INDEX IF NOT EXISTS idx_skill_installs_platform ON skill_installs(os_platform);

-- Aggregated installation statistics (for fast queries)
CREATE TABLE IF NOT EXISTS skill_install_stats (
  skill_name TEXT PRIMARY KEY,
  total_installs INTEGER DEFAULT 0,
  last_install_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_skill_install_stats_installs ON skill_install_stats(total_installs);
CREATE INDEX IF NOT EXISTS idx_skill_install_stats_recent ON skill_install_stats(last_install_at);
