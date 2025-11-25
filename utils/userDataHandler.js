const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = './database/userData.db';
const backupDir = './database/backups';

// Ensure directories exist
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
}
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Open database with optimizations
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');

console.log('[Database] SQLite initialized with WAL mode');

// Create schema if not exists
db.exec(`
    CREATE TABLE IF NOT EXISTS guild_users (
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        messageCount INTEGER DEFAULT 0,
        achievements TEXT DEFAULT '[]',
        activeTime INTEGER DEFAULT 0,
        lastActiveStart INTEGER,
        voiceTime INTEGER DEFAULT 0,
        voiceJoinTime INTEGER,
        lastActive INTEGER,
        joinDate INTEGER,
        reactionCount INTEGER DEFAULT 0,
        reactionsGiven INTEGER DEFAULT 0,
        memeCount INTEGER DEFAULT 0,
        supportMessages INTEGER DEFAULT 0,
        totalGameTime INTEGER DEFAULT 0,
        gameStartTime INTEGER,
        eventCount INTEGER DEFAULT 0,
        isBooster INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
    ) WITHOUT ROWID;
    
    CREATE INDEX IF NOT EXISTS idx_guild_xp ON guild_users(guild_id, xp DESC);
    CREATE INDEX IF NOT EXISTS idx_guild_level ON guild_users(guild_id, level DESC);
    CREATE INDEX IF NOT EXISTS idx_user_achievements ON guild_users(user_id, guild_id, achievements);
    CREATE INDEX IF NOT EXISTS idx_last_active ON guild_users(guild_id, lastActive DESC);
`);

// Prepared statements (cached for performance)
const statements = {
    getUser: db.prepare('SELECT * FROM guild_users WHERE user_id = ? AND guild_id = ?'),
    
    insertUser: db.prepare(`
        INSERT OR REPLACE INTO guild_users (
            user_id, guild_id, xp, level, messageCount, achievements,
            activeTime, lastActiveStart, voiceTime, voiceJoinTime,
            lastActive, joinDate, reactionCount, reactionsGiven,
            memeCount, supportMessages, totalGameTime, gameStartTime,
            eventCount, isBooster, coins
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    
    getAllUsers: db.prepare('SELECT * FROM guild_users WHERE guild_id = ? ORDER BY xp DESC'),
    
    getLeaderboard: db.prepare('SELECT * FROM guild_users WHERE guild_id = ? ORDER BY xp DESC LIMIT ?')
};

// Active time tracking threshold
const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize user in database
 */
function initUser(userId, guildId) {
    let user = statements.getUser.get(userId, guildId);
    
    if (!user) {
        const now = Date.now();
        statements.insertUser.run(
            userId, guildId,
            0, 1, 0, '[]',
            0, null, 0, null,
            now, now, 0, 0,
            0, 0, 0, null,
            0, 0, 0
        );
        
        user = statements.getUser.get(userId, guildId);
        console.log(`[Database] Initialized user ${userId} in guild ${guildId}`);
    }
    
    // Parse achievements if needed
    if (user && typeof user.achievements === 'string') {
        try {
            user.achievements = JSON.parse(user.achievements);
        } catch (error) {
            user.achievements = [];
        }
    }
    
    return user;
}

/**
 * Get user data
 */
function getUserData(userId, guildId) {
    const user = statements.getUser.get(userId, guildId);
    
    if (user && typeof user.achievements === 'string') {
        try {
            user.achievements = JSON.parse(user.achievements);
        } catch (error) {
            user.achievements = [];
        }
    }
    
    return user;
}

/**
 * Update a single field
 */
function updateField(userId, guildId, field, value) {
    const sql = `UPDATE guild_users SET ${field} = ? WHERE user_id = ? AND guild_id = ?`;
    db.prepare(sql).run(value, userId, guildId);
}

/**
 * Update active time tracking
 */
function updateActiveTime(userId, guildId) {
    const user = getUserData(userId, guildId);
    if (!user) return;
    
    const now = Date.now();
    
    if (user.lastActiveStart) {
        const timeSinceLastActive = now - user.lastActive;
        
        if (timeSinceLastActive < INACTIVE_THRESHOLD) {
            const sessionTime = Math.floor((now - user.lastActiveStart) / 1000);
            const newActiveTime = (user.activeTime || 0) + sessionTime;
            
            const sql = `UPDATE guild_users SET activeTime = ?, lastActiveStart = ?, lastActive = ? WHERE user_id = ? AND guild_id = ?`;
            db.prepare(sql).run(newActiveTime, now, now, userId, guildId);
            return;
        }
    }
    
    const sql = `UPDATE guild_users SET lastActiveStart = ?, lastActive = ? WHERE user_id = ? AND guild_id = ?`;
    db.prepare(sql).run(now, now, userId, guildId);
}

/**
 * Get leaderboard for guild
 */
function getLeaderboard(guildId, limit = 100) {
    const users = statements.getLeaderboard.all(guildId, limit);
    
    users.forEach(user => {
        if (typeof user.achievements === 'string') {
            try {
                user.achievements = JSON.parse(user.achievements);
            } catch (error) {
                user.achievements = [];
            }
        }
    });
    
    return users;
}

/**
 * Get all users for a guild
 */
function getAllGuildUsers(guildId) {
    const users = statements.getAllUsers.all(guildId);
    
    users.forEach(user => {
        if (typeof user.achievements === 'string') {
            try {
                user.achievements = JSON.parse(user.achievements);
            } catch (error) {
                user.achievements = [];
            }
        }
    });
    
    return users;
}

/**
 * Backup database
 */
function backupDatabase() {
    try {
        const backupPath = path.join(backupDir, `userData_${Date.now()}.db`);
        db.backup(backupPath);
        console.log(`[Database] Backup created: ${backupPath}`);
        
        // Clean old backups (keep last 20)
        cleanOldBackups(20);
        
        return true;
    } catch (error) {
        console.error('[Database] Backup failed:', error);
        return false;
    }
}

/**
 * Clean old backup files
 */
function cleanOldBackups(keepCount = 20) {
    try {
        const backups = fs.readdirSync(backupDir)
            .filter(file => file.startsWith('userData_') && file.endsWith('.db'))
            .map(file => ({
                name: file,
                path: path.join(backupDir, file),
                time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);
        
        if (backups.length > keepCount) {
            backups.slice(keepCount).forEach(backup => {
                fs.unlinkSync(backup.path);
            });
        }
    } catch (error) {
        console.error('[Database] Error cleaning backups:', error);
    }
}

/**
 * Save data (compatibility function - SQLite auto-saves)
 */
function saveData(immediate = false) {
    // SQLite commits immediately, this is for compatibility
    if (immediate) {
        db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').run();
    }
}

// Auto-backup every hour
setInterval(() => {
    backupDatabase();
}, 60 * 60 * 1000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('[Database] SIGINT received, closing database...');
    db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').run();
    db.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('[Database] SIGTERM received, closing database...');
    db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').run();
    db.close();
    process.exit(0);
});

/**
 * BACKWARD COMPATIBILITY LAYER
 * Mimics old userData[userId].guilds[guildId] structure
 */
const userData = new Proxy({}, {
    get(target, userId) {
        if (userId === 'inspect' || userId === Symbol.toStringTag) return undefined;
        
        return {
            guilds: new Proxy({}, {
                get(guildTarget, guildId) {
                    if (guildId === 'inspect' || guildId === Symbol.toStringTag) return undefined;
                    
                    // Get current data
                    const data = getUserData(userId, guildId);
                    if (!data) {
                        initUser(userId, guildId);
                        return getUserData(userId, guildId);
                    }
                    
                    // Return proxy that intercepts property sets
                    return new Proxy(data, {
                        set(dataTarget, prop, value) {
                            // Update in database
                            updateField(userId, guildId, prop, 
                                prop === 'achievements' ? JSON.stringify(value) : 
                                prop === 'isBooster' ? (value ? 1 : 0) : 
                                value
                            );
                            
                            // Update local cache
                            dataTarget[prop] = value;
                            return true;
                        }
                    });
                },
                
                set(guildTarget, guildId, value) {
                    // Handle userData[userId].guilds[guildId] = {...}
                    console.warn('[Database] Direct assignment to guilds not recommended, use updateField()');
                    return true;
                }
            })
        };
    }
});

module.exports = {
    db,
    initUser,
    getUserData,
    updateField,
    updateActiveTime,
    getLeaderboard,
    getAllGuildUsers,
    backupDatabase,
    saveData,
    userData  // Backward compatibility
};
