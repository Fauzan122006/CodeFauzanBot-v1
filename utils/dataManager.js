const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../botconfig/config.json');
const roleListPath = path.join(__dirname, '../botconfig/roleList.json');
const userDataPath = path.join(__dirname, '../database/userData.json');
const achievementListPath = path.join(__dirname, '../botconfig/achievementList.json');
const rulesPath = path.join(__dirname, '../botconfig/rules.json');
const serverListPath = path.join(__dirname, '../botconfig/serverList.json');

let config = {};
let roleList = { guilds: {} };
let userData = {};
let achievementList = {};
let rules = {};
let serverList = {};

const loadData = () => {
    // Coba load config.json jika ada, jika tidak gunakan env langsung
    if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath);
        if (data.length > 0) {
            try {
                config = JSON.parse(data);
                console.log('[DataManager] Loaded config.json');
            } catch (e) {
                console.error('Error parsing config.json:', e);
            }
        } else {
            console.warn('Warning: config.json is empty.');
        }
    } else {
        console.warn('Warning: config.json not found in botconfig folder. Using environment variables.');
    }

    // Gunakan environment variables sebagai sumber utama jika di production atau sebagai override
    if (process.env.NODE_ENV === 'production' || !fs.existsSync(configPath)) {
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
        console.log('[DataManager] Config set from environment variables.');
    }

    // Load file lain tetap seperti semula
    if (fs.existsSync(roleListPath)) {
        const data = fs.readFileSync(roleListPath);
        if (data.length > 0) {
            try {
                roleList = JSON.parse(data);
                console.log('[DataManager] Loaded roleList.json');
            } catch (e) {
                console.error('Error parsing roleList.json:', e);
                process.exit(1);
            }
        } else {
            console.warn('Warning: roleList.json is empty. Initializing as empty object.');
            roleList = { guilds: {} };
        }
    } else {
        console.warn('Warning: roleList.json not found. Creating empty object.');
        roleList = { guilds: {} };
    }

    // Load userData.json
    if (fs.existsSync(userDataPath)) {
        const data = fs.readFileSync(userDataPath);
        if (data.length > 0) {
            try {
                userData = JSON.parse(data);
                console.log('[DataManager] Loaded userData.json');
            } catch (e) {
                console.error('Error parsing userData.json:', e);
                process.exit(1);
            }
        } else {
            console.warn('Warning: userData.json is empty. Initializing as empty object.');
            userData = {};
        }
    } else {
        console.warn('Warning: userData.json not found. Creating empty object.');
        userData = {};
    }

    // Load achievementList.json
    if (fs.existsSync(achievementListPath)) {
        const data = fs.readFileSync(achievementListPath);
        if (data.length > 0) {
            try {
                achievementList = JSON.parse(data);
                console.log('[DataManager] Loaded achievementList.json');
            } catch (e) {
                console.error('Error parsing achievementList.json:', e);
                process.exit(1);
            }
        } else {
            console.warn('Warning: achievementList.json is empty. Initializing as empty object.');
            achievementList = {};
        }
    } else {
        console.warn('Warning: achievementList.json not found. Creating empty object.');
        achievementList = {};
    }

    // Load rules.json
    if (fs.existsSync(rulesPath)) {
        const data = fs.readFileSync(rulesPath);
        if (data.length > 0) {
            try {
                rules = JSON.parse(data);
                console.log('[DataManager] Loaded rules.json');
            } catch (e) {
                console.error('Error parsing rules.json:', e);
                process.exit(1);
            }
        } else {
            console.warn('Warning: rules.json is empty. Initializing as empty object.');
            rules = {};
        }
    } else {
        console.warn('Warning: rules.json not found. Creating empty object.');
        rules = {};
    }

    // Load serverList.json
    if (fs.existsSync(serverListPath)) {
        const data = fs.readFileSync(serverListPath);
        if (data.length > 0) {
            try {
                serverList = JSON.parse(data);
                console.log('[DataManager] Loaded serverList.json');
            } catch (e) {
                console.error('Error parsing serverList.json:', e);
                process.exit(1);
            }
        } else {
            console.warn('Warning: serverList.json is empty. Initializing as empty object.');
            serverList = {};
        }
    } else {
        console.warn('Warning: serverList.json not found. Creating empty object.');
        serverList = {};
    }
};

loadData();

function saveConfig() {
    if (process.env.NODE_ENV !== 'production') {
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log('Config saved successfully.');
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }
}

function saveRoleList() {
    try {
        fs.writeFileSync(roleListPath, JSON.stringify(roleList, null, 2));
        console.log('RoleList saved successfully.');
    } catch (error) {
        console.error('Error saving roleList:', error);
    }
}

function saveData() {
    try {
        fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
        console.log('UserData saved successfully from dataManager.js');
    } catch (error) {
        console.error('Error saving userData:', error);
    }
}

function saveAchievementList() {
    try {
        fs.writeFileSync(achievementListPath, JSON.stringify(achievementList, null, 2));
        console.log('AchievementList saved successfully.');
    } catch (error) {
        console.error('Error saving achievementList:', error);
    }
}

function saveRules() {
    try {
        fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2));
        console.log('Rules saved successfully.');
    } catch (error) {
        console.error('Error saving rules:', error);
    }
}

function saveServerList() {
    try {
        fs.writeFileSync(serverListPath, JSON.stringify(serverList, null, 2));
        console.log('ServerList saved successfully.');
    } catch (error) {
        console.error('Error saving serverList:', error);
    }
}

// Fungsi untuk memastikan serverList[guildId] selalu ada dan menginisialisasi achievements
function ensureGuildConfig(guildId) {
    if (!serverList[guildId]) {
        serverList[guildId] = {
            achievements: {},
            achievementChannel: null // Inisialisasi achievementChannel
        };
        // Inisialisasi status aktif untuk setiap achievement
        Object.keys(achievementList).forEach(achievementId => {
            serverList[guildId].achievements[achievementId] = { enabled: false };
        });
        saveServerList();
        console.log(`[DataManager] Initialized config for guild: ${guildId}`);
    } else {
        if (!serverList[guildId].achievements) {
            serverList[guildId].achievements = {};
            Object.keys(achievementList).forEach(achievementId => {
                serverList[guildId].achievements[achievementId] = { enabled: false };
            });
        }
        if (!serverList[guildId].achievementChannel) {
            serverList[guildId].achievementChannel = null; // Pastikan ada achievementChannel
        }
        saveServerList();
        console.log(`[DataManager] Ensured achievements and achievementChannel for guild: ${guildId}`);
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
    loadData,
    ensureGuildConfig,
    initRankCard
};