const { db } = require('./dataManager');

db.exec(`
    CREATE TABLE IF NOT EXISTS moderation_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        moderator_id TEXT NOT NULL,
        action TEXT NOT NULL,
        reason TEXT,
        created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_mod_actions_guild_created
    ON moderation_actions(guild_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_mod_actions_user_created
    ON moderation_actions(user_id, created_at DESC);
`);

const insertActionStmt = db.prepare(`
    INSERT INTO moderation_actions (guild_id, user_id, moderator_id, action, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const getRecentWarnCountStmt = db.prepare(`
    SELECT COUNT(*) AS count
    FROM moderation_actions
    WHERE guild_id = ?
      AND user_id = ?
      AND action = 'warn'
      AND created_at >= ?
`);

const listRecentActionsStmt = db.prepare(`
    SELECT id, guild_id, user_id, moderator_id, action, reason, created_at
    FROM moderation_actions
    WHERE guild_id = ?
    ORDER BY created_at DESC
    LIMIT ?
`);

function addModerationAction({ guildId, userId, moderatorId, action, reason }) {
    insertActionStmt.run(guildId, userId, moderatorId, action, reason || '', Date.now());
}

function getRecentWarnCount(guildId, userId, windowMs = 7 * 24 * 60 * 60 * 1000) {
    const since = Date.now() - windowMs;
    const row = getRecentWarnCountStmt.get(guildId, userId, since);
    return row?.count || 0;
}

function listRecentActions(guildId, limit = 50) {
    return listRecentActionsStmt.all(guildId, limit);
}

module.exports = {
    addModerationAction,
    getRecentWarnCount,
    listRecentActions
};
