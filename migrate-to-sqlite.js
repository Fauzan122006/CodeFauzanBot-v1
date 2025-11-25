const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

console.log('=== SQLite Migration Script ===\n');

// Paths
const jsonPath = './database/userData.json';
const dbPath = './database/userData.db';
const backupDir = './database/backups';

// Ensure directories exist
if (!fs.existsSync('./database')) {
    fs.mkdirSync('./database', { recursive: true });
}
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Backup existing DB if exists
if (fs.existsSync(dbPath)) {
    const backupPath = path.join(backupDir, `userData_before_migration_${Date.now()}.db`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Backed up existing DB to: ${backupPath}`);
}

// Create/open database
console.log('Creating SQLite database...');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and crash recovery
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB cache

console.log('✅ Database opened with WAL mode');

// Create schema
console.log('Creating schema...');
db.exec(`
    -- Main user-guild data table
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
    
    -- Indexes for fast queries
    CREATE INDEX IF NOT EXISTS idx_guild_xp ON guild_users(guild_id, xp DESC);
    CREATE INDEX IF NOT EXISTS idx_guild_level ON guild_users(guild_id, level DESC);
    CREATE INDEX IF NOT EXISTS idx_user_achievements ON guild_users(user_id, guild_id, achievements);
    CREATE INDEX IF NOT EXISTS idx_last_active ON guild_users(guild_id, lastActive DESC);
`);

console.log('✅ Schema created with indexes');

// Read JSON data
if (!fs.existsSync(jsonPath)) {
    console.log('⚠️ No userData.json found. Creating empty database.');
    console.log('✅ Migration complete! Database ready for use.');
    process.exit(0);
}

console.log('Reading userData.json...');
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Prepare insert statement
const insert = db.prepare(`
    INSERT OR REPLACE INTO guild_users (
        user_id, guild_id, xp, level, messageCount, achievements,
        activeTime, lastActiveStart, voiceTime, voiceJoinTime,
        lastActive, joinDate, reactionCount, reactionsGiven,
        memeCount, supportMessages, totalGameTime, gameStartTime,
        eventCount, isBooster, coins
    ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
    )
`);

// Migrate data in transaction (much faster)
console.log('Migrating data...');
const startTime = Date.now();

const insertMany = db.transaction((userData) => {
    let count = 0;
    
    for (const [userId, user] of Object.entries(userData)) {
        if (!user.guilds || typeof user.guilds !== 'object') {
            console.warn(`⚠️ Skipping user ${userId} - invalid guilds data`);
            continue;
        }
        
        for (const [guildId, data] of Object.entries(user.guilds)) {
            try {
                insert.run(
                    userId,
                    guildId,
                    data.xp || 0,
                    data.level || 1,
                    data.messageCount || 0,
                    JSON.stringify(data.achievements || []),
                    data.activeTime || 0,
                    data.lastActiveStart || null,
                    data.voiceTime || 0,
                    data.voiceJoinTime || null,
                    data.lastActive || Date.now(),
                    data.joinDate || Date.now(),
                    data.reactionCount || 0,
                    data.reactionsGiven || 0,
                    data.memeCount || 0,
                    data.supportMessages || 0,
                    data.totalGameTime || 0,
                    data.gameStartTime || null,
                    data.eventCount || 0,
                    data.isBooster ? 1 : 0,
                    data.coins || 0
                );
                count++;
            } catch (error) {
                console.error(`❌ Error inserting user ${userId} in guild ${guildId}:`, error.message);
            }
        }
    }
    
    return count;
});

const recordCount = insertMany(jsonData);
const duration = Date.now() - startTime;

console.log(`✅ Migrated ${recordCount} records in ${duration}ms`);

// Verify migration
const verification = db.prepare('SELECT COUNT(*) as count FROM guild_users').get();
console.log(`✅ Verification: ${verification.count} records in database`);

// Create backup of JSON
const jsonBackupPath = path.join(backupDir, `userData_${Date.now()}.json`);
fs.copyFileSync(jsonPath, jsonBackupPath);
console.log(`✅ JSON backup created: ${jsonBackupPath}`);

// Database stats
const stats = db.prepare(`
    SELECT 
        COUNT(DISTINCT user_id) as users,
        COUNT(DISTINCT guild_id) as guilds,
        SUM(xp) as total_xp,
        MAX(level) as max_level
    FROM guild_users
`).get();

console.log('\n=== Database Statistics ===');
console.log(`Total Users: ${stats.users}`);
console.log(`Total Guilds: ${stats.guilds}`);
console.log(`Total Records: ${recordCount}`);
console.log(`Total XP: ${stats.total_xp}`);
console.log(`Highest Level: ${stats.max_level}`);

console.log('\n✅ Migration complete!');
console.log('\n📝 Next steps:');
console.log('1. Test the bot with new database');
console.log('2. Monitor for 24 hours');
console.log('3. If stable, you can archive userData.json');

db.close();
