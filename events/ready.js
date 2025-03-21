const { config } = require('../utils/dataManager');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`Bot is ready as ${client.user.tag}`);

        // Daftar semua command dari folder commands
        const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.js'));
        const commands = [];

        for (const file of commandFiles) {
            const command = require(path.join(__dirname, '../commands', file));
            commands.push(command.data.toJSON());
        }

        await client.application.commands.set(commands);
    },
};