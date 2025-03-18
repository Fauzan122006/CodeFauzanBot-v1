const { Client, IntentsBitField, REST, Routes, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
global.fetch = require('node-fetch');
const { config, saveConfig } = require('./utils/saveData');
const { EmbedBuilder } = require('discord.js');
const codefauzan = `
 _____           _         ______                         
/  __ \         | |        |  ___|                        
| /  \/ ___   __| | ___    | |_ __ _ _   _ ______ _ _ __  
| |    / _ \ / _  |/ _ \   |  _/ _  | | | |_  / _  | '_ \ 
| \__/\ (_) | (_| |  __/   | || (_| | |_| |/ / (_| | | | |
 \____/\___/ \__,_|\___|   \_| \__,_|\__,_/___\__,_|_| |_|
                                                          
                                                          
`;

// Log token untuk debugging (jangan share log ini ke orang lain)
console.log(codefauzan);
console.log('Starting bot initialization...');
console.log('Token yang digunakan:', config.clienttoken);

// Inisialisasi bot dengan intents yang dibutuhkan
console.log('Initializing Discord client...');
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
console.log('Loading commands...');
const commandsPath = path.join(__dirname, 'commands');
console.log('Commands path:', commandsPath);

let commandFiles;
try {
    commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    console.log('Command files found:', commandFiles);
} catch (error) {
    console.error('Error reading commands folder:', error);
    commandFiles = [];
}

const commands = [];
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`Successfully loaded command: ${command.data.name} from ${file}`);
    } catch (error) {
        console.error(`Error loading command from ${file}:`, error);
    }
}

// Load semua event dari folder events
console.log('Loading events...');
const eventsPath = path.join(__dirname, 'events');
console.log('Events path:', eventsPath);

let eventFiles;
try {
    eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    console.log('Event files found:', eventFiles);
} catch (error) {
    console.error('Error reading events folder:', error);
    eventFiles = [];
}

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
            console.log(`Successfully loaded one-time event: ${event.name} from ${file}`);
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
            console.log(`Successfully loaded recurring event: ${event.name} from ${file}`);
        }
    } catch (error) {
        console.error(`Error loading event from ${file}:`, error);
    }
}

// Registrasi slash commands saat bot siap
console.log('Setting up client ready event...');
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        console.log('Registering application commands...');
        const rest = new REST({ version: '10' }).setToken(config.clienttoken);
        await rest.put(
            Routes.applicationCommands(config.clientid),
            { body: commands }
        );
        console.log('Successfully registered application commands:', commands.map(cmd => cmd.name));
    } catch (error) {
        console.error('Error registering commands:', error);
    }

    // Interval untuk cek update YouTube (setiap 5 menit)
    console.log('Starting YouTube update check interval (every 5 minutes)...');
    setInterval(checkYouTubeUpdates, 300000);
});

// Fungsi cek update YouTube
async function checkYouTubeUpdates() {
    console.log('Checking YouTube updates...');
    const youtubeApiKey = config.youtubeApiKey;
    const channelId = config.youtubeChannelId;

    if (!youtubeApiKey || youtubeApiKey === 'YOUR_YOUTUBE_API_KEY') {
        console.error('Error: youtubeApiKey is missing or not set in botconfig/config.json. Please set a valid API key.');
        return;
    }
    if (!channelId || channelId === 'YOUR_YOUTUBE_CHANNEL_ID') {
        console.error('Error: youtubeChannelId is missing or not set in botconfig/config.json. Please set a valid Channel ID.');
        return;
    }

    const guilds = Object.keys(config).filter(key => key.match(/^\d+$/));
    for (const guildId of guilds) {
        const socialChannelId = config[guildId]?.socialChannel;

        if (!socialChannelId) {
            console.log('Social channel not set for guild:', guildId);
            continue;
        }

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            console.error('Guild not found:', guildId);
            continue;
        }

        const socialChannel = guild.channels.cache.get(socialChannelId);
        if (!socialChannel) {
            console.error('Social channel not found:', socialChannelId);
            continue;
        }

        if (!socialChannel.permissionsFor(client.user).has(['SendMessages', 'ViewChannel', 'EmbedLinks'])) {
            console.error('Bot doesn\'t have permission to send messages or embed links in social channel:', socialChannelId);
            continue;
        }

        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=5&order=date&key=${youtubeApiKey}`);
            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                console.log('No recent videos found on YouTube for guild:', guildId);
                continue;
            }

            const latestVideo = data.items[0];
            const videoId = latestVideo.id.videoId;
            const videoTitle = latestVideo.snippet.title;
            const videoLink = `https://www.youtube.com/watch?v=${videoId}`;
            const thumbnail = latestVideo.snippet.thumbnails?.default?.url || latestVideo.snippet.thumbnails?.medium?.url; // Ambil default atau medium kalau default kosong

            if (!thumbnail) {
                console.warn('No thumbnail found for video:', videoLink);
            }

            if (!config.lastYouTubeVideoId || config.lastYouTubeVideoId !== videoId) {
                const embed = new EmbedBuilder()
                    .setTitle('🎥 New YouTube Video!')
                    .setDescription(`Hey @everyone, a new video just dropped! Check it out!\n\n**${videoTitle}**\n${videoLink}`)
                    .setColor('#00BFFF')
                    .setThumbnail(thumbnail) // Pastikan thumbnail di-set
                    .setTimestamp();

                await socialChannel.send({ embeds: [embed] });
                config.lastYouTubeVideoId = videoId;
                saveConfig();
                console.log(`Posted new YouTube video in guild ${guildId}: ${videoLink}`);
            } else {
                console.log('No new videos to post for guild:', guildId);
            }
        } catch (error) {
            console.error('Error checking YouTube updates for guild', guildId, ':', error);
        }
    }
}

// Cek token sebelum login
if (!config.clienttoken || config.clienttoken === "YOUR_BOT_TOKEN") {
    console.error("Error: Bot token is missing or not set in botconfig/config.json. Please set a valid token.");
    process.exit(1);
}

console.log('Logging in to Discord...');
client.login(config.clienttoken).catch(error => {
    console.error('Error logging in:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});