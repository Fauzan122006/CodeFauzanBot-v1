const { Client, IntentsBitField, REST, Routes, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const chalk = require('chalk');
global.fetch = fetch;
const { config, saveConfig } = require('./utils/dataManager');
const { saveData } = require('./utils/userDataHandler');

const codefauzan = `
---

/ ** \ | | | \_**|  
| / \/ **\_ **| | **_ | |_ ** \_ \_ _ **\_\_** _ _ \_\_  
| | / _ \ / _ |/ _ \ | _/ _ | | | |_ / _ | '\_ \
| \__/\ (_) | (_| | \_\_/ | || (_| | |_| |/ / (_| | | | |
\_**\_/\_**/ \__,_|\_**| \_| \__,_|\__,_/\_**\__,_|_| |_|

`;

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

log('Index', codefauzan);
log('Index', 'Starting bot initialization...');
log('Index', 'Token yang digunakan: [HIDDEN]');

log('Index', 'Initializing Discord client...');
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMessageReactions
    ]
});

client.commands = new Collection();

log('Index', 'Loading commands...');
const commandsPath = path.join(__dirname, 'commands');
log('Index', `Commands path: ${commandsPath}`);

let commandFiles;
try {
    commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    log('Index', `Command files found: [${commandFiles.join(', ')}]`);
} catch (error) {
    log('Index', `Error reading commands folder: ${error.message}`, 'error');
    commandFiles = [];
}

const commands = [];
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        log('Index', `Successfully loaded command: ${command.data.name} from ${file}`, 'success');
    } catch (error) {
        log('Index', `Error loading command from ${file}: ${error.message}`, 'error');
    }
}

log('Index', 'Loading events...');
const eventsPath = path.join(__dirname, 'events');
log('Index', `Events path: ${eventsPath}`);

let eventFiles;
try {
    eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    log('Index', `Event files found: [${eventFiles.join(', ')}]`);
} catch (error) {
    log('Index', `Error reading events folder: ${error.message}`, 'error');
    eventFiles = [];
}

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
            log('Index', `Successfully loaded one-time event: ${event.name} from ${file}`, 'success');
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
            log('Index', `Successfully loaded recurring event: ${event.name} from ${file}`, 'success');
        }
    } catch (error) {
        log('Index', `Error loading event from ${file}: ${error.message}`, 'error');
    }
}

log('Index', 'Setting up client ready event...');
client.once('ready', async () => {
    log('Index', `Bot is ready as ${client.user.tag}`, 'success');
    log('Index', `Logged in as ${client.user.tag}`);

    try {
        log('Index', 'Registering application commands...');
        const rest = new REST({ version: '10' }).setToken(config.clienttoken);

        // Hapus semua perintah lama (global commands)
        await rest.put(Routes.applicationCommands(config.clientid), { body: [] });
        log('Index', 'Successfully cleared all application commands.', 'success');

        // Daftarkan ulang perintah baru
        await rest.put(
            Routes.applicationCommands(config.clientid),
            { body: commands }
        );
        log('Index', `Successfully registered application commands: [${commands.map(cmd => cmd.name).join(', ')}]`, 'success');
    } catch (error) {
        log('Index', `Error registering application commands: ${error.message}`, 'error');
    }

    log('Index', 'Starting YouTube update check interval (every 5 minutes)...');
    setInterval(() => checkYouTubeUpdates(client), 300000);
    checkYouTubeUpdates(client);

    log('Index', 'Starting user data save interval (every 5 minutes)...');
    setInterval(() => {
        saveData();
        log('Index', 'UserData saved successfully', 'success');
    }, 300000);
});

async function checkYouTubeUpdates(client) {
    log('YouTubeUpdate', 'Checking YouTube updates...');
    const youtubeApiKey = config.youtubeApiKey;

    if (!youtubeApiKey || youtubeApiKey === 'YOUR_YOUTUBE_API_KEY') {
        log('YouTubeUpdate', 'Error: youtubeApiKey is missing or not set in botconfig/config.json.', 'error');
        return;
    }

    const guilds = Object.keys(config).filter(key => key.match(/^\d+$/));
    for (const guildId of guilds) {
        const socialChannelId = config[guildId]?.socialChannel;
        const channelId = config[guildId]?.youtubeChannelId;

        if (!socialChannelId || !channelId) {
            log('YouTubeUpdate', `Social channel or YouTube channel ID not set for guild: ${guildId}`);
            continue;
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('YouTubeUpdate', `Guild not found: ${guildId}`, 'error');
            continue;
        }

        let socialChannel = guild.channels.cache.get(socialChannelId);
        if (!socialChannel) {
            log('YouTubeUpdate', `Social channel not in cache: ${socialChannelId}, attempting to fetch...`);
            try {
                socialChannel = await guild.channels.fetch(socialChannelId);
            } catch (error) {
                log('YouTubeUpdate', `Failed to fetch social channel ${socialChannelId}: ${error.message}`, 'error');
                continue;
            }
        }

        if (!socialChannel) {
            log('YouTubeUpdate', `Social channel not found after fetch: ${socialChannelId}`, 'error');
            continue;
        }

        if (!socialChannel.permissionsFor(client.user)?.has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
            log('YouTubeUpdate', `Bot lacks permissions (SendMessages, ViewChannel, EmbedLinks) in social channel: ${socialChannelId}`, 'error');
            continue;
        }

        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=5&order=date&key=${youtubeApiKey}`);
            if (!response.ok) {
                throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                log('YouTubeUpdate', `No recent videos found on YouTube for guild: ${guildId}`);
                continue;
            }

            const latestVideo = data.items[0];
            const videoId = latestVideo.id.videoId;
            const videoTitle = latestVideo.snippet.title;
            const videoLink = `https://www.youtube.com/watch?v=${videoId}`;
            const thumbnail = latestVideo.snippet.thumbnails?.default?.url || latestVideo.snippet.thumbnails?.medium?.url;

            if (!thumbnail) {
                log('YouTubeUpdate', `No thumbnail found for video: ${videoLink}`, 'warning');
            }

            if (!config[guildId]) config[guildId] = {};
            if (!config[guildId].lastYouTubeVideoId || config[guildId].lastYouTubeVideoId !== videoId) {
                const embed = new EmbedBuilder()
                    .setTitle('🎥 Video YouTube Baru!')
                    .setDescription(`Hai @everyone, video baru telah diunggah! Cek sekarang!\n\n**${videoTitle}**\n${videoLink}`)
                    .setColor(config.colorthemecode || '#00BFFF')
                    .setThumbnail(thumbnail)
                    .setTimestamp();

                await socialChannel.send({ embeds: [embed] });
                config[guildId].lastYouTubeVideoId = videoId;
                saveConfig();
                log('YouTubeUpdate', `Posted new YouTube video in guild ${guildId}: ${videoLink}`, 'success');
            } else {
                log('YouTubeUpdate', `No new videos to post for guild: ${guildId}`);
            }
        } catch (error) {
            log('YouTubeUpdate', `Error checking YouTube updates for guild ${guildId}: ${error.message}`, 'error');
        }
    }
}

if (!config.clienttoken || config.clienttoken === "YOUR_BOT_TOKEN") {
    log('Index', "Error: Bot token is missing or not set in botconfig/config.json. Please set a valid token.", 'error');
    process.exit(1);
}

log('Index', 'Logging in to Discord...');
client.login(config.clienttoken).catch(error => {
    log('Index', `Error logging in: ${error.message}`, 'error');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log('Index', `Unhandled Rejection at: ${promise} reason: ${reason}`, 'error');
});

process.on('uncaughtException', (error) => {
    log('Index', `Uncaught Exception: ${error.message}`, 'error');
});

process.on('warning', (warning) => {
    if (warning.name === 'DeprecationWarning') {
        log('Index', `DeprecationWarning: ${warning.message}`, 'warning');
    } else {
        log('Index', `Warning: ${warning.message}`, 'warning');
    }
});

require('./dashboard');