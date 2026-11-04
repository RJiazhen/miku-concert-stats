-- Catalog schema. View counts and milestones are append-only observations.
-- Dates from VocaDB stay at day precision unless time_evidence is set.

CREATE TABLE sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  license TEXT NOT NULL,
  notes TEXT NOT NULL
);

CREATE TABLE series (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_ja TEXT,
  description TEXT,
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL
);

CREATE TABLE performances (
  id INTEGER PRIMARY KEY,
  series_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  name_ja TEXT,
  venue_name TEXT,
  country_code TEXT,
  start_date TEXT,
  end_date TEXT,
  showtime_local TEXT,
  timezone TEXT,
  time_precision TEXT NOT NULL,
  time_evidence TEXT,
  role TEXT NOT NULL,
  series_number INTEGER,
  series_suffix TEXT,
  song_list_id INTEGER,
  vocadb_status TEXT,
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL
);

CREATE TABLE performance_links (
  performance_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  PRIMARY KEY (performance_id, url)
);

CREATE TABLE edition_premieres (
  series_id INTEGER NOT NULL,
  series_number INTEGER NOT NULL,
  premiere_performance_id INTEGER NOT NULL,
  premiere_date TEXT NOT NULL,
  premiere_showtime_local TEXT,
  rule TEXT NOT NULL,
  PRIMARY KEY (series_id, series_number)
);

CREATE TABLE song_lists (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  featured_category TEXT,
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  announced_at TEXT,
  -- 'vocadb' for an event song list, 'album' for a release tracklist used as a fallback.
  source TEXT NOT NULL DEFAULT 'vocadb',
  -- VocaDB album id and medium when source is 'album'.
  album_id INTEGER,
  medium TEXT
);

CREATE TABLE songs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_ja TEXT,
  name_en TEXT,
  artist_string TEXT,
  song_type TEXT NOT NULL,
  publish_date TEXT,
  length_seconds INTEGER,
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL
);

-- Vocalists credited on a song, from VocaDB's structured artists list.
-- artist_string collapses a large cast into `feat. various`, so the cast is stored per name.
CREATE TABLE song_vocalists (
  song_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  PRIMARY KEY (song_id, name)
);

CREATE TABLE setlist_items (
  song_list_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  listed_song_id INTEGER NOT NULL,
  notes TEXT,
  PRIMARY KEY (song_list_id, position)
);

CREATE TABLE setlist_item_songs (
  song_list_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (song_list_id, position, song_id)
);

CREATE TABLE medley_quarantine (
  song_list_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  listed_song_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  PRIMARY KEY (song_list_id, position)
);

CREATE TABLE videos (
  vocadb_pv_id INTEGER PRIMARY KEY,
  song_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  platform_video_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  author TEXT,
  pv_type TEXT,
  publish_date TEXT,
  disabled INTEGER NOT NULL
);

CREATE TABLE view_snapshots (
  platform TEXT NOT NULL,
  platform_video_id TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  view_count INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  PRIMARY KEY (platform, platform_video_id, collected_at)
);

CREATE TABLE milestones (
  platform TEXT NOT NULL,
  platform_video_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  achieved_at TEXT NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT NOT NULL,
  PRIMARY KEY (platform, platform_video_id, kind)
);

CREATE TABLE conversion_formulas (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  version TEXT,
  scope TEXT,
  sample_period TEXT,
  train_metrics_json TEXT,
  holdout_metrics_json TEXT,
  formula_json TEXT,
  reason TEXT NOT NULL
);
