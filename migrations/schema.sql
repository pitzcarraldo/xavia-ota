-- Xavia OTA Database Schema for Cloudflare D1
-- This file contains the database schema for the Xavia OTA service

-- Table: releases
-- Stores information about app releases
CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  runtime_version TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  timestamp TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  commit_message TEXT,
  update_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: releases_tracking  
-- Tracks download statistics for releases
CREATE TABLE IF NOT EXISTS releases_tracking (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  release_id TEXT NOT NULL,
  download_timestamp TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_releases_runtime_version ON releases(runtime_version);
CREATE INDEX IF NOT EXISTS idx_releases_timestamp ON releases(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_releases_path ON releases(path);
CREATE INDEX IF NOT EXISTS idx_tracking_release_id ON releases_tracking(release_id);
CREATE INDEX IF NOT EXISTS idx_tracking_platform ON releases_tracking(platform);
CREATE INDEX IF NOT EXISTS idx_tracking_timestamp ON releases_tracking(download_timestamp DESC);