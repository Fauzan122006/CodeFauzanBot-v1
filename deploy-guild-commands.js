const { REST, Routes } = require('discord.js');
const fs = require('fs');
const { config } = require('./utils/dataManager');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.clienttoken);

// Gunakan Testing Server ID dari config
const guildId = config.TestingServerID;

(async () => {
    try {
        console.log(`🔄 Deploying ${commands.length} commands to guild: ${guildId}`);

        const data = await rest.put(
            Routes.applicationGuildCommands(config.clientid, guildId),
            { body: commands },
        );

        console.log(`✅ Successfully deployed ${data.length} commands to your server!`);
        console.log('🎉 Commands are now available INSTANTLY in your test server!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
})();
