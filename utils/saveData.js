const fs = require('fs');
const path = require('path');

// Path untuk config.json dan roleList.json
const configPath = path.join(__dirname, '../botconfig/config.json');
const roleListPath = path.join(__dirname, '../botconfig/roleList.json');

let config = {};
let roleList = [];

// Tambah pengecekan untuk memastikan file config ada dan valid
if (fs.existsSync(configPath)) {
    const data = fs.readFileSync(configPath);
    if (data.length > 0) {
        try {
            config = JSON.parse(data);
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

// Tambah pengecekan untuk memastikan file roleList ada dan valid
if (fs.existsSync(roleListPath)) {
    const data = fs.readFileSync(roleListPath);
    if (data.length > 0) {
        try {
            roleList = JSON.parse(data);
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

module.exports = {
    config,
    roleList,
    saveConfig,
    saveRoleList
};