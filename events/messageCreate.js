const { handleLevelUp } = require('../utils/levelUpHandler');
const { handleAchievements } = require('../utils/achievementHandler');
const { userData, initUser } = require('../utils/functions');
const { config } = require('../utils/dataManager');
const chalk = require('chalk'); // Import chalk untuk warna

// Fungsi untuk log dengan timestamp dan warna
const log = (module, message, level = 'info') => {
    const timestamp = new Date().toISOString();
    let coloredMessage;

    switch (level.toLowerCase()) {
        case 'success':
            coloredMessage = chalk.cyan(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'error':
            coloredMessage = chalk.red(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'warning':
            coloredMessage = chalk.yellow(`[${timestamp}] [${module}] ${message}`);
            break;
        case 'info':
        default:
            coloredMessage = chalk.white(`[${timestamp}] [${module}] ${message}`);
            break;
    }

    console.log(coloredMessage);
};

// Buat mapping command prefix ke slash command
const commandMapping = {
    'rank': 'rank',
    'event-join': 'event-join',
    'get-roles': 'get-roles',
    'post-social': 'post-social',
    'set-achievement': 'set-achievement',
    'set-level': 'set-level',
    'set-roles': 'set-roles',
    'set-rules': 'set-rules',
    'set-social': 'set-social',
    'set-welcome': 'set-welcome',
    'help': 'help',
    'reset-achievement': 'reset-achievement'
};

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        const userId = message.author.id;
        const guild = message.guild;

        // Handle prefix command
        const prefix = config.prefix || '..';
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            if (!commandMapping[commandName]) return; // Command tidak ditemukan

            const command = client.commands.get(commandMapping[commandName]);
            if (!command) return;

            try {
                // Simulasi interaction untuk prefix command
                const fakeInteraction = {
                    user: message.author,
                    guild: message.guild,
                    channel: message.channel,
                    client: client,
                    options: {
                        getUser: (key) => args[0] ? message.mentions.users.first() || message.guild.members.cache.get(args[0])?.user : null,
                        getString: (key) => args[0] || null
                    },
                    deferReply: async () => {
                        await message.channel.sendTyping();
                    },
                    editReply: async (options) => {
                        await message.channel.send(options);
                    },
                    reply: async (options) => {
                        await message.channel.send(options);
                    }
                };

                await command.execute(fakeInteraction, client);
                log('PrefixCommand', `Executed ${commandName} for user ${userId}`, 'success');
            } catch (error) {
                log('PrefixCommand', `Error executing ${commandName}: ${error.message}`, 'error');
                await message.channel.send({ content: 'There was an error while executing this command!' });
            }
            return; // Jangan lanjutkan ke logika XP kalau ini prefix command
        }

        // Logika XP dan achievement
        initUser(userId);

        userData[userId].messageCount = (userData[userId].messageCount || 0) + 1;
        const xpGain = Math.floor(Math.random() * 50) + 50; // 50-100 XP per pesan
        userData[userId].xp = (userData[userId].xp || 0) + xpGain;
        userData[userId].lastActive = Date.now();

        log('MessageCreate', `Processing message from user ${userId} in guild ${guild.id}`);
        log('MessageCreate', `User ${userId} sent a message. Message count: ${userData[userId].messageCount}`);
        log('MessageCreate', `User ${userId} gained ${xpGain} XP. Total XP: ${userData[userId].xp}`);

        try {
            await handleLevelUp(userId, guild, message.author);
            await handleAchievements(userId, guild, 'message');
            await handleAchievements(userId, guild, 'level');
        } catch (error) {
            log('MessageCreate', `Error handling level up or achievements for user ${userId}: ${error.message}`, 'error');
        }

        // saveData() dihapus karena sudah ada interval di index.js
        // log('MessageCreate', `Data saved for user ${userId}`, 'success');
    },
};