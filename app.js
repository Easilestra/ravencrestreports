import 'dotenv/config';
import express from 'express';
import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import {
  createReport,
  getReport,
  getOpenReports,
  getReportsForPlayer,
  setReportStatus,
} from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

const ROBLOX_REPORT_SECRET = process.env.ROBLOX_REPORT_SECRET;

/**
 * Roblox calls this to log a report for tracking. It does NOT post
 * anything to Discord — Roblox posts the visible embed itself via the
 * raw webhook. This endpoint just gets the report ID into the DB so
 * /reports, /player-history, /resolve, /ignore, and /ban can find it.
 */
app.post('/report', express.json(), async (req, res) => {
  if (req.get('x-report-secret') !== ROBLOX_REPORT_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { reportedUserId, reportedUsername, reporterUserId, reporterUsername, reason } = req.body;

  if (!reportedUserId || !reportedUsername || !reporterUserId || !reporterUsername) {
    return res.status(400).json({ error: 'missing fields' });
  }

  const reportId = createReport({
    reportedId: String(reportedUserId),
    reportedName: reportedUsername,
    reporterId: String(reporterUserId),
    reporterName: reporterUsername,
    reason: typeof reason === 'string' ? reason.slice(0, 500) : '',
  });

  return res.json({ ok: true, reportId });
});

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  const { type, data } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'reports') {
      const open = getOpenReports();

      if (open.length === 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'No open reports.', flags: InteractionResponseFlags.EPHEMERAL },
        });
      }

      const lines = open.map(
        (r) => `#${r.id} — **${r.reported_name}** reported by **${r.reporter_name}** — ${r.reason || 'no reason given'}`
      );

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: lines.join('\n'), flags: InteractionResponseFlags.EPHEMERAL },
      });
    }

    if (name === 'player-history') {
      const userId = data.options.find((o) => o.name === 'user_id').value;
      const history = getReportsForPlayer(userId);

      if (history.length === 0) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `No reports found for user ID ${userId}.`, flags: InteractionResponseFlags.EPHEMERAL },
        });
      }

      const lines = history.map(
        (r) => `#${r.id} — [${r.status}] reported by **${r.reporter_name}** — ${r.reason || 'no reason given'}`
      );

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: lines.join('\n'), flags: InteractionResponseFlags.EPHEMERAL },
      });
    }

    if (name === 'resolve' || name === 'ignore' || name === 'ban') {
      const statusMap = { resolve: 'resolved', ignore: 'ignored', ban: 'banned' };
      const status = statusMap[name];
      const reportId = data.options.find((o) => o.name === 'report_id').value;
      const moderator = req.body.member?.user?.username || 'unknown';

      const report = getReport(reportId);
      if (!report) {
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `No report found with ID ${reportId}.`, flags: InteractionResponseFlags.EPHEMERAL },
        });
      }

      setReportStatus(reportId, status, moderator);

      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: `Report #${reportId} (**${report.reported_name}**) marked **${status}** by ${moderator}.`,
        },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});