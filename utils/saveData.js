const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../botconfig/config.json');

let config = {};

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

function saveConfig() {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

module.exports = {
    config,
    saveConfig
};