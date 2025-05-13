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
    // Load config.json
    if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath);
        if (data.length > 0) {
            try {
                config = JSON.parse(data);
                console.log('[DataManager] Loaded config.json');
            } catch (e) {
                console.error('Error parsing config.json:', e);
                process.exit(1);
            }
        } else {
            console.error('Error: config.json is empty.');
            process.exit(1);
        }
    } else {
        console.error('Error: config.json not found in botconfig folder.');
        process.exit(1);
    }

    // Load roleList.json
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
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('Config saved successfully.');
    } catch (error) {
        console.error('Error saving config:', error);
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