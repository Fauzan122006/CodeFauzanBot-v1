const { Client, IntentsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config } = require('./utils/saveData');

// Log token untuk debugging (jangan share log ini ke orang lain)
console.log('Token yang digunakan:', config.clienttoken);

// Inisialisasi bot dengan intents yang dibutuhkan
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers
    ]
});

// Load semua event dari folder events
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(__dirname, 'events', file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// Error handling untuk login
if (!config.clienttoken || config.clienttoken === "YOUR_BOT_TOKEN") {
    console.error("Error: Bot token is missing or not set in botconfig/config.json. Please set a valid token.");
    process.exit(1);
}

client.login(config.clienttoken).catch(error => {
    console.error('Error logging in:', error);
    process.exit(1);
});