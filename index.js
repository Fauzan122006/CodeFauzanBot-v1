const fs = require('fs');
const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } = require('discord.js');
const fetch = require('node-fetch');
const chalk = require('chalk');
global.fetch = fetch;
const { config, saveConfig, serverList, saveServerList } = require('./utils/dataManager');
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
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    log('Index', `Registered command: ${command.data.name}`, 'success');
}

log('Index', 'Loading events...');
const eventsPath = './events';
let eventFiles;
try {
    eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    log('Index', `Event files found: [${eventFiles.join(', ')}]`);
} catch (error) {
    log('Index', `Error reading events folder: ${error.message}`, 'error');
    eventFiles = [];
}

for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
        log('Index', `Successfully loaded one-time event: ${event.name} from ${file}`, 'success');
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
        log('Index', `Successfully loaded recurring event: ${event.name} from ${file}`, 'success');
    }
}

client.once('ready', async () => {
    log('Index', `Bot is ready as ${client.user.tag}`, 'success');
    log('Index', `Logged in as ${client.user.tag}`);

    client.user.setPresence({
        activities: [{
            name: 'Configure me at codefauzanbot-v1-production.up.railway.app',
            type: ActivityType.Playing
        }],
        status: 'online'
    });

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

    const guilds = Object.keys(serverList).filter(key => key.match(/^\d+$/));
    for (const guildId of guilds) {
        const socialChannelId = serverList[guildId]?.socialChannel;
        const channelId = serverList[guildId]?.youtubeChannelId;

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

            if (!serverList[guildId].lastYouTubeVideoId || serverList[guildId].lastYouTubeVideoId !== videoId) {
                const embed = new EmbedBuilder()
                    .setTitle('🎥 Video YouTube Baru!')
                    .setDescription(`Hai @everyone, video baru telah diunggah! Cek sekarang!\n\n**${videoTitle}**\n${videoLink}`)
                    .setColor(config.colorthemecode || '#00BFFF')
                    .setThumbnail(thumbnail)
                    .setTimestamp();

                await socialChannel.send({ embeds: [embed] });
                serverList[guildId].lastYouTubeVideoId = videoId;
                saveServerList();
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

// Jalankan dashboard dengan mengirimkan client sebagai parameter
const dashboard = require('./dashboard');
dashboard.start(client);