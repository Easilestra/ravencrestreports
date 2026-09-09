import Database from 'better-sqlite3';

const db = new Database('reports.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reported_id TEXT NOT NULL,
    reported_name TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reporter_name TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    resolved_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export function createReport({ reportedId, reportedName, reporterId, reporterName, reason }) {
  const stmt = db.prepare(`
    INSERT INTO reports (reported_id, reported_name, reporter_id, reporter_name, reason)
    VALUES (@reportedId, @reportedName, @reporterId, @reporterName, @reason)
  `);
  const info = stmt.run({ reportedId, reportedName, reporterId, reporterName, reason });
  return info.lastInsertRowid;
}

export function getReport(reportId) {
  return db.prepare(`SELECT * FROM reports WHERE id = ?`).get(reportId);
}

export function getOpenReports(limit = 15) {
  return db.prepare(`
    SELECT * FROM reports WHERE status = 'open' ORDER BY created_at DESC LIMIT ?
  `).all(limit);
}

export function getReportsForPlayer(reportedId, limit = 15) {
  return db.prepare(`
    SELECT * FROM reports WHERE reported_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(reportedId, limit);
}

export function setReportStatus(reportId, status, resolvedBy) {
  db.prepare(`
    UPDATE reports SET status = ?, resolved_by = ? WHERE id = ?
  `).run(status, resolvedBy, reportId);
}

export default db;