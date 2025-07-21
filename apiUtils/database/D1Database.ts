import { DatabaseInterface, Release, Tracking, TrackingMetrics } from './DatabaseInterface';
import { Tables } from './DatabaseFactory';

export class D1Database implements DatabaseInterface {
  private readonly db: any; // Using any for now since D1 types are complex

  constructor() {
    if (typeof globalThis === 'undefined' || !(globalThis as any).DB) {
      throw new Error(
        'D1 database binding not found. Make sure DB is properly bound in wrangler.toml',
      );
    }
    this.db = (globalThis as any).DB;
  }

  async getLatestReleaseRecordForRuntimeVersion(runtimeVersion: string): Promise<Release | null> {
    const query = `
      SELECT id, runtime_version as runtimeVersion, path, timestamp, commit_hash as commitHash, commit_message as commitMessage, update_id as updateId
      FROM ${Tables.RELEASES} 
      WHERE runtime_version = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const stmt = this.db.prepare(query).bind(runtimeVersion);
    const result = await stmt.first();
    return result || null;
  }

  async getReleaseByPath(path: string): Promise<Release | null> {
    const query = `
      SELECT id, runtime_version as runtimeVersion, path, timestamp, commit_hash as commitHash, commit_message as commitMessage, update_id as updateId
      FROM ${Tables.RELEASES} 
      WHERE path = ?
    `;

    const stmt = this.db.prepare(query).bind(path);
    const result = await stmt.first();
    return result || null;
  }

  async createTracking(tracking: Omit<Tracking, 'id'>): Promise<Tracking> {
    const query = `
      INSERT INTO ${Tables.RELEASES_TRACKING} (release_id, platform, download_timestamp)
      VALUES (?, ?, ?)
      RETURNING id, release_id as releaseId, download_timestamp as downloadTimestamp, platform
    `;

    const timestamp = tracking.downloadTimestamp || new Date().toISOString();
    const stmt = this.db.prepare(query).bind(tracking.releaseId, tracking.platform, timestamp);
    const result = await stmt.first();

    if (!result) {
      throw new Error('Failed to create tracking record');
    }

    return result as Tracking;
  }

  async getReleaseTrackingMetrics(releaseId: string): Promise<TrackingMetrics[]> {
    const query = `
      SELECT platform, COUNT(*) as count
      FROM ${Tables.RELEASES_TRACKING}
      WHERE release_id = ?
      GROUP BY platform
    `;

    const stmt = this.db.prepare(query).bind(releaseId);
    const results = await stmt.all();
    return results.results.map((row: any) => ({
      platform: row.platform,
      count: Number(row.count),
    }));
  }

  async getReleaseTrackingMetricsForAllReleases(): Promise<TrackingMetrics[]> {
    const query = `
      SELECT platform, COUNT(*) as count
      FROM ${Tables.RELEASES_TRACKING}
      GROUP BY platform
    `;

    const stmt = this.db.prepare(query);
    const results = await stmt.all();
    return results.results.map((row: any) => ({
      platform: row.platform,
      count: Number(row.count),
    }));
  }

  async createRelease(release: Omit<Release, 'id'>): Promise<Release> {
    const query = `
      INSERT INTO ${Tables.RELEASES} (runtime_version, path, timestamp, commit_hash, commit_message, update_id)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id, runtime_version as runtimeVersion, path, timestamp, commit_hash as commitHash, commit_message as commitMessage, update_id as updateId
    `;

    const stmt = this.db
      .prepare(query)
      .bind(
        release.runtimeVersion,
        release.path,
        release.timestamp,
        release.commitHash,
        release.commitMessage,
        release.updateId,
      );
    const result = await stmt.first();

    if (!result) {
      throw new Error('Failed to create release');
    }

    return result as Release;
  }

  async getRelease(id: string): Promise<Release | null> {
    const query = `
      SELECT id, runtime_version as runtimeVersion, path, timestamp, commit_hash as commitHash, commit_message as commitMessage, update_id as updateId
      FROM ${Tables.RELEASES} 
      WHERE id = ?
    `;

    const stmt = this.db.prepare(query).bind(id);
    const result = await stmt.first();
    return result || null;
  }

  async listReleases(): Promise<Release[]> {
    const query = `
      SELECT id, runtime_version as runtimeVersion, path, timestamp, commit_hash as commitHash, commit_message as commitMessage, update_id as updateId
      FROM ${Tables.RELEASES}
      ORDER BY timestamp DESC
    `;

    const stmt = this.db.prepare(query);
    const results = await stmt.all();
    return results.results as Release[];
  }
}
