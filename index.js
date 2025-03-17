const { Client, IntentsBitField, REST, Routes, Collection } = require('discord.js');
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

// Collection untuk menyimpan command
client.commands = new Collection();

// Load semua command dari folder commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

const commands = [];
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

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

// Registrasi slash commands saat bot siap
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        const rest = new REST({ version: '10' }).setToken(config.clienttoken);
        await rest.put(
            Routes.applicationCommands(config.clientid),
            { body: commands }
        );
        console.log('Successfully registered application commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// Error handling untuk login
if (!config.clienttoken || config.clienttoken === "YOUR_BOT_TOKEN") {
    console.error("Error: Bot token is missing or not set in botconfig/config.json. Please set a valid token.");
    process.exit(1);
}

client.login(config.clienttoken).catch(error => {
    console.error('Error logging in:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});