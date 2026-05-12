const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const configPath = path.join(__dirname, '../botconfig/config.json');
const dotenvPath = path.join(__dirname, '../.env');
const roleListPath = path.join(__dirname, '../botconfig/roleList.json');
const achievementListPath = path.join(__dirname, '../botconfig/achievementList.json');
const rulesPath = path.join(__dirname, '../botconfig/rules.json');
const serverListPath = path.join(__dirname, '../botconfig/serverList.json');
const dbDir = path.join(__dirname, '../database');
const dbPath = path.join(dbDir, 'botData.db');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.exec(`
    CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
    )
`);
const CURRENT_SCHEMA_VERSION = 1;
const getSchemaVersion = db.prepare('SELECT value FROM kv_store WHERE key = ?');
const setSchemaVersion = db.prepare(`
    INSERT INTO kv_store (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

function runSchemaMigrations() {
    const row = getSchemaVersion.get('meta:schema_version');
    const current = row ? parseInt(row.value, 10) : 0;
    if (Number.isNaN(current)) {
        throw new Error('Invalid schema version in kv_store');
    }
    if (current > CURRENT_SCHEMA_VERSION) {
        throw new Error(`Database schema version ${current} is newer than app schema ${CURRENT_SCHEMA_VERSION}`);
    }

    // Future migrations go here.
    if (current < CURRENT_SCHEMA_VERSION) {
        setSchemaVersion.run('meta:schema_version', String(CURRENT_SCHEMA_VERSION), Date.now());
    }
}
runSchemaMigrations();

const getKV = db.prepare('SELECT value FROM kv_store WHERE key = ?');
const upsertKV = db.prepare(`
    INSERT INTO kv_store (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
`);

let config = {};
let roleList = { guilds: {} };
let userData = {};
let achievementList = {};
let rules = {};
let serverList = {};

function loadDotEnvFile() {
    if (!fs.existsSync(dotenvPath)) return;
    const raw = fs.readFileSync(dotenvPath, 'utf8');
    const lines = raw.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const idx = trimmed.indexOf('=');
        if (idx <= 0) continue;

        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
            value = value.slice(1, -1);
        }

        if (process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}

function readJsonFile(filePath, fallbackValue) {
    if (!fs.existsSync(filePath)) return fallbackValue;

    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallbackValue;

    return JSON.parse(raw);
}

function loadKeyWithJsonFallback(key, filePath, fallbackValue) {
    const dbRow = getKV.get(key);
    if (dbRow?.value) {
        try {
            return JSON.parse(dbRow.value);
        } catch (error) {
            console.error(`[DataManager] Failed to parse SQLite key "${key}":`, error);
        }
    }

    const fromJson = readJsonFile(filePath, fallbackValue);
    upsertKV.run(key, JSON.stringify(fromJson), Date.now());
    return fromJson;
}

function saveKey(key, value) {
    upsertKV.run(key, JSON.stringify(value), Date.now());
}

function applyEnvOverrides() {
    config.clienttoken = process.env.CLIENT_TOKEN || config.clienttoken || '';
    config.Note_Token = process.env.NOTE_TOKEN || config.Note_Token || 'Put Your Bot Token Above (If using replit, make a secret "clienttoken" and keep this empty)';
    config.clientname = process.env.CLIENT_NAME || config.clientname || 'CodeFauzan [TEST]';
    config.clientsecret = process.env.CLIENT_SECRET || config.clientsecret || '';
    config.clientid = process.env.CLIENT_ID || config.clientid || '';
    config.callbackurl = process.env.CALLBACK_URL || config.callbackurl || 'http://localhost:3000/auth/discord/callback';
    config.sessionsecret = process.env.SESSION_SECRET || config.sessionsecret || 'your-very-long-and-random-session-secret-1234567890';
    config.TestingServerID = process.env.TESTING_SERVER_ID || config.TestingServerID || '';
    config.clientavatar = process.env.CLIENT_AVATAR || config.clientavatar || '';
    config.prefix = process.env.PREFIX || config.prefix || '!!';
    config.developerID = JSON.parse(process.env.DEVELOPER_ID || JSON.stringify(config.developerID) || '["836333707680809041"]');
    config.spotifyClientId = process.env.SPOTIFY_CLIENT_ID || config.spotifyClientId || '';
    config.spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET || config.spotifyClientSecret || '';
    config.spotifyRefreshToken = process.env.SPOTIFY_REFRESH_TOKEN || config.spotifyRefreshToken || '';
    config.colorthemecode = process.env.COLOR_THEME_CODE || config.colorthemecode || '00BFFF';
    config.randomMessages_Cooldown = JSON.parse(process.env.RANDOM_MESSAGES_COOLDOWN || JSON.stringify(config.randomMessages_Cooldown) || '["Wait Dont Spam...", "Spaming Isn\'t Cool....", "Never Gonna Let You Down", "Hold ur horses....", "Are you wild?"]');
    config.NOTE = process.env.NOTE || config.NOTE || 'IF YOU DONT PUT STUFF HERE IT WILL THROW ERRS';
    config.topgg = process.env.TOPGG || config.topgg || '';
    config.defaultChannels = {
        welcomeChannel: process.env.DEFAULT_WELCOME_CHANNEL || config.defaultChannels?.welcomeChannel || '',
        levelChannel: process.env.DEFAULT_LEVEL_CHANNEL || config.defaultChannels?.levelChannel || '',
        achievementChannel: process.env.DEFAULT_ACHIEVEMENT_CHANNEL || config.defaultChannels?.achievementChannel || '',
        rolesChannel: process.env.DEFAULT_ROLES_CHANNEL || config.defaultChannels?.rolesChannel || ''
    };
    config.levelUpImage = process.env.LEVEL_UP_IMAGE || config.levelUpImage || 'https://s6.gifyu.com/images/bbXYO.gif';
    config.welcomeImage = process.env.WELCOME_IMAGE || config.welcomeImage || 'https://s6.gifyu.com/images/bbXYO.gif';
    config.rolesImage = process.env.ROLES_IMAGE || config.rolesImage || 'https://example.com/roles-background.gif';
    config.rulesBanner = process.env.RULES_BANNER || config.rulesBanner || 'https://s6.gifyu.com/images/bz2Gc.gif';
    config.lastYouTubeVideoId = process.env.LAST_YOUTUBE_VIDEO_ID || config.lastYouTubeVideoId || 'R6wFMjABpjU';
    config.youtubeApiKey = process.env.YOUTUBE_API_KEY || config.youtubeApiKey || '';
    config.youtubeChannelId = process.env.YOUTUBE_CHANNEL_ID || config.youtubeChannelId || 'UCUlSBRbY5sRo-9b9ewkWQrA';
    config.categoryImages = {
        'Games Catalog': process.env.CATEGORY_GAMES_CATALOG_IMAGE || config.categoryImages?.['Games Catalog'] || 'https://s6.gifyu.com/images/bbXYP.gif',
        'PC & Mobile Games Catalog': process.env.CATEGORY_PC_MOBILE_GAMES_CATALOG_IMAGE || config.categoryImages?.['PC & Mobile Games Catalog'] || 'https://s6.gifyu.com/images/bbXru.md.gif',
        'Hobbies Catalog': process.env.CATEGORY_HOBBIES_CATALOG_IMAGE || config.categoryImages?.['Hobbies Catalog'] || 'https://s6.gifyu.com/images/bbXrf.gif',
        'Entertainment Catalog': process.env.CATEGORY_ENTERTAINMENT_CATALOG_IMAGE || config.categoryImages?.['Entertainment Catalog'] || 'https://s6.gifyu.com/images/bbXrB.md.gif',
        'Notification Catalog': process.env.CATEGORY_NOTIFICATION_CATALOG_IMAGE || config.categoryImages?.['Notification Catalog'] || 'https://s6.gifyu.com/images/bbXtb.gif'
    };
    config['997668978103164978'] = {
        welcomeChannel: process.env.SERVER_997668978103164978_WELCOME_CHANNEL || config['997668978103164978']?.welcomeChannel || '997668979021721644'
    };
}

const loadData = () => {
    loadDotEnvFile();

    config = loadKeyWithJsonFallback('config', configPath, {});
    roleList = loadKeyWithJsonFallback('roleList', roleListPath, { guilds: {} });
    achievementList = loadKeyWithJsonFallback('achievementList', achievementListPath, {});
    rules = loadKeyWithJsonFallback('rules', rulesPath, {});
    serverList = loadKeyWithJsonFallback('serverList', serverListPath, {});

    // config.json tetap boleh jadi source of truth untuk local/dev.
    const configFromJson = readJsonFile(configPath, {});
    config = {
        ...config,
        ...configFromJson,
        defaultChannels: {
            ...(config.defaultChannels || {}),
            ...(configFromJson.defaultChannels || {})
        },
        categoryImages: {
            ...(config.categoryImages || {}),
            ...(configFromJson.categoryImages || {})
        }
    };

    applyEnvOverrides();
    saveKey('config', config);

    console.log('[DataManager] Loaded data from SQLite database');
};

loadData();

function saveConfig() {
    saveKey('config', config);
}

function saveRoleList() {
    saveKey('roleList', roleList);
}

function saveData() {
    // userData sudah dipindahkan ke userDataHandler (SQLite).
}

function saveAchievementList() {
    saveKey('achievementList', achievementList);
}

function saveRules() {
    saveKey('rules', rules);
}

function saveServerList() {
    saveKey('serverList', serverList);
}

function getStorageHealth() {
    const health = db.prepare('PRAGMA integrity_check').get();
    return {
        dbPath,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        integrity: health?.integrity_check || 'unknown',
        walMode: db.pragma('journal_mode', { simple: true })
    };
}

// Fungsi untuk memastikan serverList[guildId] selalu ada dan menginisialisasi achievements
function ensureGuildConfig(guildId) {
    if (!serverList[guildId]) {
        serverList[guildId] = {
            achievements: {},
            achievementChannel: null
        };
        // Inisialisasi status aktif untuk setiap achievement
        Object.keys(achievementList).forEach(achievementId => {
            serverList[guildId].achievements[achievementId] = { enabled: false };
        });
        saveServerList();
    } else {
        if (!serverList[guildId].achievements) {
            serverList[guildId].achievements = {};
            Object.keys(achievementList).forEach(achievementId => {
                serverList[guildId].achievements[achievementId] = { enabled: false };
            });
        }
        if (!serverList[guildId].achievementChannel) {
            serverList[guildId].achievementChannel = null;
        }
    }
}

// Fungsi untuk menginisialisasi rankCard di serverList[guildId]
function initRankCard(guildId) {
    ensureGuildConfig(guildId); // Pastikan guild ada
    if (!serverList[guildId].rankCard) {
        serverList[guildId].rankCard = {
            font: 'Default',
            mainColor: '#FFFFFF',
            backgroundColor: '#000000',
            overlayOpacity: 0.5,
            backgroundImage: ''
        };
        saveServerList();
        console.log(`[DataManager] Initialized rankCard for guild: ${guildId}`);
    }
}

module.exports = {
    db,
    config,
    roleList,
    userData,
    achievementList,
    rules,
    serverList,
    saveConfig,
    saveRoleList,
    saveData,
    saveAchievementList,
    saveRules,
    saveServerList,
    getStorageHealth,
    loadData,
    ensureGuildConfig,
    initRankCard
};
