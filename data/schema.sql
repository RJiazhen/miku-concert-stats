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

-- One producer-side credit per real VocaDB artist, from the song's `fields=Artists` payload.
-- `artist_id` is VocaDB's artist id, so name variants collapse onto one filter option.
-- `roles` is the auditable evidence: `producer` when `categories` names Producer, plus the
-- lower-cased Composer / Arranger / VoiceManipulator roles that also qualified the credit.
-- That set mirrors VocaDB's own "Producers" section (https://wiki.vocadb.net/docs/song-entry-page);
-- Lyricist is excluded because VocaDB groups lyricists under "Other artists", and a "Default"
-- role means "inherit the artist type's default roles" rather than a named credit.
-- Publisher, Illustrator, Animator, Mixer, Mastering, Instrumentalist, and label- or circle-only
-- credits are not producers either; tuning (VoiceManipulator / 調声) is deliberately kept.
-- Display precedence: these rows lead the 制作人 column and the ranking producer filter, because
-- they only carry producer-side jobs. `producerCredit(artist_string)` is the fallback for songs
-- that have no structured row at all (e.g. Anamanaguchi), never an override.
CREATE TABLE song_producers (
  song_id INTEGER NOT NULL,
  artist_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  roles TEXT NOT NULL,
  PRIMARY KEY (song_id, artist_id)
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

-- Derived 演出 layer, one row per performance. VocaDB stores one setlist object for a whole
-- run, so this layer records which 场次 rows were kept and where the attribution came from.
-- External sources live here and not per 场次: every lookup is keyed by performance.
CREATE TABLE performance_setlists (
  performance_id INTEGER PRIMARY KEY,
  -- Source song list this 演出's rows were derived from.
  source_list_id INTEGER NOT NULL,
  source_kind TEXT NOT NULL,
  -- 'none' when every source row applies, 'filtered' when some were dropped, 'curated' when a
  -- hand-checked correction changed the result.
  change TEXT NOT NULL,
  status TEXT NOT NULL,
  -- 'vocadb-note' (notes name a date or half), 'vocadb-shared' (no note at all),
  -- 'external' (an outside source located it), 'unresolved' (nothing did).
  resolution TEXT NOT NULL,
  -- Row count of the source list, so a page can print "本场 25 首 / 源 29 行".
  source_row_count INTEGER NOT NULL,
  -- JSON array of dates this 演出 was verified to have a daytime and a night-time show.
  day_night_dates TEXT,
  -- 1 when an outside source disagrees with VocaDB or with docs/data-issues.md and nobody ruled yet.
  conflict INTEGER NOT NULL,
  -- 1 when the attribution rests only on non-high-confidence sources, so a human should review it.
  pending_review INTEGER NOT NULL,
  note TEXT
);

-- Outside evidence behind one 演出's attribution. A 演出 may cite several URLs.
CREATE TABLE performance_setlist_sources (
  performance_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  accessed_at TEXT NOT NULL,
  confidence TEXT NOT NULL,
  note TEXT,
  conflict INTEGER NOT NULL,
  PRIMARY KEY (performance_id, url)
);

-- One 场次 of the derived layer. Only parser facts; no sources here.
CREATE TABLE performance_show_setlists (
  performance_id INTEGER NOT NULL,
  show_key TEXT NOT NULL,
  date TEXT,
  half TEXT,
  item_count INTEGER NOT NULL,
  omitted_count INTEGER NOT NULL,
  uncertain INTEGER NOT NULL,
  reasons TEXT NOT NULL,
  PRIMARY KEY (performance_id, show_key)
);

-- The ordered setlist of one 场次. `song_id` and `medley_id` are mutually exclusive:
-- a medley row points at a medley entry instead of a single song.
CREATE TABLE performance_show_setlist_items (
  performance_id INTEGER NOT NULL,
  show_key TEXT NOT NULL,
  position INTEGER NOT NULL,
  source_position INTEGER,
  song_id INTEGER,
  medley_id INTEGER,
  evidence TEXT NOT NULL,
  notes TEXT,
  PRIMARY KEY (performance_id, show_key, position),
  CHECK ((song_id IS NULL) <> (medley_id IS NULL))
);

-- One complete medley entry. Empty until a source line splits into several verifiable songs.
CREATE TABLE medleys (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  note TEXT,
  source_url TEXT NOT NULL
);

CREATE TABLE medley_songs (
  medley_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  song_id INTEGER NOT NULL,
  PRIMARY KEY (medley_id, position)
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
