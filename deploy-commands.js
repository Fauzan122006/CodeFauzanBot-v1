const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { config } = require('./utils/dataManager');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
    console.log(`✅ Loaded: ${command.data.name}`);
}

const rest = new REST({ version: '10' }).setToken(config.clienttoken);

(async () => {
    try {
        console.log(`\n🔄 Started refreshing ${commands.length} application (/) commands...`);

        // Deploy globally (akan tersedia di semua server dalam 1 jam)
        const data = await rest.put(
            Routes.applicationCommands(config.clientid),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands globally!`);
        console.log('\n⏰ Commands will be available in all servers within 1 hour.');
        console.log('💡 For instant access in a specific server, add your server ID to config.json as "guildId"');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
})();
