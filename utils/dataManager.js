const fs = require('fs');
const path = require('path');

// Path untuk semua file JSON
const configPath = path.join(__dirname, '../botconfig/config.json');
const roleListPath = path.join(__dirname, '../botconfig/roleList.json');
const userDataPath = path.join(__dirname, '../database/userData.json');
const achievementListPath = path.join(__dirname, '../botconfig/achievementList.json');
const rulesPath = path.join(__dirname, '../botconfig/rules.json');

let config = {};
let roleList = [];
let userData = {};
let achievementList = {};
let rules = {};

// Fungsi untuk load semua data
const loadData = () => {
    // Pengecekan untuk config.json
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

    // Pengecekan untuk roleList.json
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
            console.warn('Warning: roleList.json is empty. Initializing as empty array.');
            roleList = [];
        }
    } else {
        console.warn('Warning: roleList.json not found. Creating empty array.');
        roleList = [];
    }

    // Pengecekan untuk userData.json
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

    // Pengecekan untuk achievementList.json
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

    // Pengecekan untuk rules.json
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
};

// Load data saat module di-import
loadData();

// Debug: Pastikan loadData adalah fungsi
console.log('[DataManager] Type of loadData:', typeof loadData);

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

module.exports = {
    config,
    roleList,
    userData,
    achievementList,
    rules,
    saveConfig,
    saveRoleList,
    saveData,
    loadData // Tambah loadData ke export
};