# Database Migration Guide - Production Ready

## Current Issues with JSON Storage:

### 🚨 **Critical Problems:**
1. **Data Loss Risk** - File corruption on crash
2. **No Atomic Writes** - Race conditions
3. **Memory Bloat** - All data in RAM
4. **Poor Performance** - Writes entire file every time
5. **No Backup Strategy** - Single point of failure

---

## ✅ **Recommended Solutions:**

### **Option 1: Better JSON (Quick Fix - 1 hour)**
**Good for:** < 500 active users

**Features:**
- ✅ Atomic writes (temp file + rename)
- ✅ Auto-backup system (keeps last 10)
- ✅ Data corruption recovery
- ✅ Save queue prevents concurrent writes
- ✅ Validation before commit

**Implementation:** Use `userDataHandler.SAFE.js`

**Pros:**
- Easy migration (just replace file)
- No new dependencies
- Works with current code

**Cons:**
- Still loads all data to memory
- Slow with 1,000+ users
- No concurrent access

---

### **Option 2: SQLite (Recommended - 2-3 hours)**
**Good for:** 500 - 50,000 users

**Why SQLite:**
- ✅ Serverless (no setup needed)
- ✅ ACID compliance (no data loss)
- ✅ Automatic locking
- ✅ Incremental updates (only changed data)
- ✅ Indexes for fast queries
- ✅ Built-in backup (.backup command)
- ✅ Low memory footprint

**Setup:**
```bash
npm install better-sqlite3
```

**Schema:**
```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    guilds TEXT NOT NULL  -- JSON of guild data
);

CREATE TABLE guild_users (
    user_id TEXT,
    guild_id TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    messageCount INTEGER DEFAULT 0,
    achievements TEXT,  -- JSON array
    activeTime INTEGER DEFAULT 0,
    voiceTime INTEGER DEFAULT 0,
    lastActive INTEGER,
    joinDate INTEGER,
    coins INTEGER DEFAULT 0,
    -- ... other fields
    PRIMARY KEY (user_id, guild_id)
);

CREATE INDEX idx_guild_xp ON guild_users(guild_id, xp DESC);
CREATE INDEX idx_guild_level ON guild_users(guild_id, level DESC);
```

**Migration Script:**
```javascript
const Database = require('better-sqlite3');
const fs = require('fs');

// Read current JSON data
const userData = JSON.parse(fs.readFileSync('./database/userData.json'));

// Create SQLite database
const db = new Database('./database/userData.db');

// Create schema
db.exec(`
    CREATE TABLE IF NOT EXISTS guild_users (
        user_id TEXT,
        guild_id TEXT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        messageCount INTEGER DEFAULT 0,
        achievements TEXT,
        activeTime INTEGER DEFAULT 0,
        voiceTime INTEGER DEFAULT 0,
        lastActive INTEGER,
        joinDate INTEGER,
        reactionsGiven INTEGER DEFAULT 0,
        memeCount INTEGER DEFAULT 0,
        supportMessages INTEGER DEFAULT 0,
        totalGameTime INTEGER DEFAULT 0,
        eventCount INTEGER DEFAULT 0,
        isBooster INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, guild_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_guild_xp ON guild_users(guild_id, xp DESC);
`);

// Migrate data
const insert = db.prepare(`
    INSERT OR REPLACE INTO guild_users VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
`);

const insertMany = db.transaction((users) => {
    for (const [userId, data] of Object.entries(users)) {
        if (!data.guilds) continue;
        
        for (const [guildId, guildData] of Object.entries(data.guilds)) {
            insert.run(
                userId,
                guildId,
                guildData.xp || 0,
                guildData.level || 1,
                guildData.messageCount || 0,
                JSON.stringify(guildData.achievements || []),
                guildData.activeTime || 0,
                guildData.voiceTime || 0,
                guildData.lastActive,
                guildData.joinDate,
                guildData.reactionsGiven || 0,
                guildData.memeCount || 0,
                guildData.supportMessages || 0,
                guildData.totalGameTime || 0,
                guildData.eventCount || 0,
                guildData.isBooster ? 1 : 0,
                guildData.coins || 0
            );
        }
    }
});

insertMany(userData);

console.log('Migration complete!');
```

**New userDataHandler.js:**
```javascript
const Database = require('better-sqlite3');
const db = new Database('./database/userData.db');

// Prepare statements (cached for performance)
const stmts = {
    getUser: db.prepare('SELECT * FROM guild_users WHERE user_id = ? AND guild_id = ?'),
    insertUser: db.prepare(`
        INSERT OR REPLACE INTO guild_users 
        (user_id, guild_id, xp, level, messageCount, achievements, ...)
        VALUES (?, ?, ?, ?, ?, ?, ...)
    `),
    updateXP: db.prepare('UPDATE guild_users SET xp = ?, level = ? WHERE user_id = ? AND guild_id = ?'),
    incrementMessages: db.prepare('UPDATE guild_users SET messageCount = messageCount + 1 WHERE user_id = ? AND guild_id = ?'),
    getLeaderboard: db.prepare('SELECT * FROM guild_users WHERE guild_id = ? ORDER BY xp DESC LIMIT 100')
};

function initUser(userId, guildId) {
    let user = stmts.getUser.get(userId, guildId);
    
    if (!user) {
        stmts.insertUser.run(
            userId, guildId, 0, 1, 0, '[]', 0, 0, Date.now(), Date.now(), 0, 0, 0, 0, 0, 0, 0
        );
        user = stmts.getUser.get(userId, guildId);
    }
    
    return user;
}

function updateUserData(userId, guildId, data) {
    const updates = Object.entries(data)
        .map(([key, value]) => `${key} = ?`)
        .join(', ');
    
    const values = Object.values(data);
    values.push(userId, guildId);
    
    db.prepare(`UPDATE guild_users SET ${updates} WHERE user_id = ? AND guild_id = ?`).run(...values);
}

// Automatic backup every hour
setInterval(() => {
    db.backup(`./database/backups/userData_${Date.now()}.db`);
    console.log('[Database] Backup created');
}, 60 * 60 * 1000);
```

**Pros:**
- ⚡ 10-100x faster than JSON
- 💾 Low memory usage
- 🔒 No data corruption
- 📊 Advanced queries (leaderboards, etc)
- 🔄 Easy replication

**Cons:**
- Requires code changes
- New dependency
- Learning curve

---

### **Option 3: MongoDB (For Scale - 4-6 hours)**
**Good for:** 50,000+ users or distributed systems

**Why MongoDB:**
- ✅ Cloud-ready (MongoDB Atlas free tier)
- ✅ Horizontal scaling
- ✅ Replica sets (auto-failover)
- ✅ Flexible schema
- ✅ Built-in aggregation

**Cons:**
- External service dependency
- Overkill for small bots

---

## 📊 **Performance Comparison:**

| Method | Users | Write Speed | Memory | Corruption Risk | Setup Time |
|--------|-------|-------------|--------|-----------------|------------|
| **Current JSON** | < 100 | Slow | High | **High** 🚨 | 0 min |
| **Safe JSON** | < 500 | Medium | High | Low | 5 min |
| **SQLite** | < 50k | **Fast** | **Low** | **None** | 2 hours |
| **MongoDB** | Unlimited | **Fast** | **Low** | **None** | 4 hours |

---

## 🎯 **Recommendation:**

### **For Your Bot:**
Based on current size:

1. **Immediate (Today):** Replace with `userDataHandler.SAFE.js`
   - 5 minute fix
   - Prevents data loss
   - Buys time for proper migration

2. **This Week:** Migrate to SQLite
   - 2-3 hours work
   - Production-ready
   - Future-proof for growth

3. **Future (>10k users):** Consider MongoDB Atlas
   - Cloud backup
   - Global distribution
   - Auto-scaling

---

## 🔧 **Implementation Priority:**

**Phase 1 (NOW - 5 min):**
- ✅ Atomic writes with backup
- ✅ Data corruption prevention
- ✅ Recovery system

**Phase 2 (This Week - 3 hours):**
- ✅ SQLite migration
- ✅ Indexed queries
- ✅ Better performance

**Phase 3 (Future - as needed):**
- ✅ Redis caching
- ✅ MongoDB/PostgreSQL
- ✅ Multi-region replication

---

## 📝 **Migration Checklist:**

### Safe JSON (Quick):
- [ ] Copy `userDataHandler.SAFE.js` to `userDataHandler.js`
- [ ] Create `database/backups` folder
- [ ] Restart bot
- [ ] Verify backups are created

### SQLite (Recommended):
- [ ] `npm install better-sqlite3`
- [ ] Run migration script
- [ ] Update userDataHandler.js
- [ ] Test all features
- [ ] Setup auto-backup
- [ ] Monitor for 24 hours
- [ ] Archive old JSON as fallback

---

## ⚠️ **Data Loss Prevention Checklist:**

Current JSON system risks:
- [x] ❌ Crash during write = corrupt file
- [x] ❌ Concurrent writes = data loss
- [x] ❌ No validation = bad data persists
- [x] ❌ No backups = total loss possible

With Safe JSON:
- [x] ✅ Atomic writes (safe)
- [x] ✅ Auto-backup (10 copies)
- [x] ✅ Validation before commit
- [x] ✅ Recovery system

With SQLite:
- [x] ✅ ACID transactions
- [x] ✅ Write-ahead logging
- [x] ✅ Automatic recovery
- [x] ✅ Point-in-time backup

---

Mau saya implement yang mana? 
1. Safe JSON (5 menit)
2. SQLite migration (2-3 jam)
3. Both (Safe JSON now, SQLite later)
