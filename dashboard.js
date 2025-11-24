const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { serverList, saveServerList, config, ensureGuildConfig, initRankCard, achievementList } = require('./utils/dataManager');
const chalk = require('chalk');
const { EmbedBuilder, ActionRowBuilder, SelectMenuBuilder, SelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const htmlToMd = require('html-to-md');
const fs = require('fs');
const path = require('path');

// Try to load canvas, fallback if not available
let createCanvas, loadImage, registerFont, fontkit;
let canvasAvailable = false;
try {
    const canvas = require('canvas');
    createCanvas = canvas.createCanvas;
    loadImage = canvas.loadImage;
    registerFont = canvas.registerFont;
    fontkit = require('fontkit');
    canvasAvailable = true;
    console.log('[Canvas] Canvas module loaded successfully');
} catch (error) {
    console.warn('[Canvas] Canvas module not available:', error.message);
    console.warn('[Canvas] Welcome cards and rank cards will be disabled');
}

// Impor middleware
const { ensureAuthenticated, ensureAdmin } = require('./middleware/auth');

// Path ke folder fonts
const fontsDir = path.join(__dirname, 'fonts');

// Daftar untuk menyimpan nama font yang ditemukan
const availableFonts = [];

// Pastikan pendaftaran font berjalan sebelum server mulai
function registerFonts() {
    if (!canvasAvailable) {
        console.log('[FontRegistration] Skipping font registration - Canvas not available');
        return;
    }
    
    if (fs.existsSync(fontsDir)) {
        console.log(`[FontRegistration] Fonts directory found at ${fontsDir}`);
        const fontFiles = fs.readdirSync(fontsDir).filter(file => file.endsWith('.ttf') || file.endsWith('.otf'));

        if (fontFiles.length === 0) {
            console.warn(`[FontRegistration] No font files (.ttf or .otf) found in ${fontsDir}`);
        }

        fontFiles.forEach(file => {
            const fontPath = path.join(fontsDir, file);
            try {
                // Baca metadata font menggunakan fontkit
                const font = fontkit.openSync(fontPath);
                const fontFamily = font.familyName || path.basename(file, path.extname(file)).replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
                
                // Daftarkan font dengan nama family yang benar
                registerFont(fontPath, { family: fontFamily });
                console.log(`[FontRegistration] Registered font: ${fontFamily} from ${file}`);
                availableFonts.push(fontFamily); // Simpan nama font family untuk digunakan di dropdown
            } catch (error) {
                console.error(`[FontRegistration] Failed to register font ${file}: ${error.message}`);
            }
        });

        console.log(`[FontRegistration] Available fonts:`, availableFonts);
    } else {
        console.error(`[FontRegistration] Fonts directory not found at ${fontsDir}`);
    }
}

// Panggil fungsi untuk mendaftarkan font
registerFonts();

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

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

function start(client) {
    app.use(session({
        secret: config.sessionsecret || 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 24 * 60 * 60 * 1000 }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // Middleware untuk menyisipkan client ke req
    app.use((req, res, next) => {
        req.client = client;
        next();
    });

    if (!config.clientid || config.clientid === 'YOUR_CLIENT_ID') {
        log('Dashboard', 'Error: clientid is missing or not set in botconfig/config.json.', 'error');
        process.exit(1);
    }

    if (!config.clientsecret || config.clientsecret === 'YOUR_CLIENT_SECRET') {
        log('Dashboard', 'Error: clientsecret is missing or not set in botconfig/config.json.', 'error');
        process.exit(1);
    }

    if (!config.callbackurl || config.callbackurl === 'http://localhost:3000/auth/discord/callback') {
        log('Dashboard', 'Warning: callbackurl is using default value. Update it in botconfig/config.json for production.', 'warning');
    }

    passport.use(new DiscordStrategy({
        clientID: config.clientid,
        clientSecret: config.clientsecret,
        callbackURL: config.callbackurl,
        scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
        log('Passport', `User authenticated: ${profile.id}`, 'success');
        return done(null, profile);
    }));

    passport.serializeUser((user, done) => {
        log('Passport', `Serializing user: ${user.id}`);
        done(null, user);
    });

    passport.deserializeUser((obj, done) => {
        log('Passport', `Deserializing user: ${obj.id}`);
        done(null, obj);
    });

    app.get('/auth/discord', passport.authenticate('discord'));

    app.get('/auth/discord/callback',
        passport.authenticate('discord', { failureRedirect: '/' }),
        (req, res) => {
            log('Auth', `Authentication callback for user: ${req.user.id}`);
            const guildId = req.query.guild_id; // Ambil guild_id dari query parameter
            if (guildId) {
                const guild = client.guilds.cache.get(guildId);
                if (guild) {
                    log('Auth', `Bot successfully joined guild ${guildId}, redirecting to dashboard`);
                    res.redirect(`/dashboard/${guildId}`);
                } else {
                    log('Auth', `Bot not yet in guild ${guildId}, redirecting to /servers`);
                    res.redirect('/servers');
                }
            } else {
                res.redirect('/servers');
            }
        }
    );

    app.get('/logout', (req, res) => {
        req.logout(() => {
            res.redirect('/');
        });
    });

    app.get('/', (req, res) => {
        res.render('index', { clientId: config.clientid });
    });

    app.get('/servers', ensureAuthenticated, (req, res) => {
        log('Servers', `Accessing /servers for user: ${req.user ? req.user.id : 'undefined'}`);
        if (!req.user) {
            log('Servers', 'req.user is undefined, redirecting to /auth/discord', 'error');
            return res.redirect('/auth/discord');
        }
    
        const guilds = req.user.guilds.map(guild => {
            const g = client.guilds.cache.get(guild.id);
            // Cek izin Administrator langsung dari data guild.permissions di req.user.guilds
            const permissions = parseInt(guild.permissions); // Konversi permissions ke integer
            const isAdmin = (permissions & 0x8) === 0x8; // 0x8 adalah bit untuk izin Administrator
            return {
                ...guild,
                hasBot: !!g, // Tambahkan properti untuk cek apakah bot ada di server
                isAdmin // Gunakan isAdmin yang dihitung dari guild.permissions
            };
        }).filter(guild => guild.isAdmin);
    
        // Buat tautan undangan bot
        const botInviteLink = `https://discord.com/oauth2/authorize?client_id=${config.clientid}&scope=bot%20applications.commands&permissions=8&redirect_uri=${encodeURIComponent(config.callbackurl)}`;
    
        res.render('servers', { guilds, botInviteLink });
    });

    app.get('/dashboard/:guildId', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        log('Dashboard', `Accessing dashboard for guild: ${guildId}`);
    
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Dashboard', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }
    
        try {
            // Pastikan serverList[guildId] ada
            ensureGuildConfig(guildId);
    
            const serverConfig = serverList[guildId];
    
            // Hitung statistik
            // 1. Running Servers: Jumlah server tempat bot berada
            const botGuildCount = client.guilds.cache.size;
    
            // 2. Registered Users: Jumlah total anggota di semua server
            let totalMembers = 0;
            client.guilds.cache.forEach(g => {
                totalMembers += g.memberCount;
            });
    
            // 3. Currently Online: Jumlah anggota yang sedang online di server saat ini
            let onlineMembers = 0;
            try {
                // Gunakan cache yang ada tanpa fetch untuk menghindari timeout
                onlineMembers = guild.members.cache.filter(m => 
                    m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd'
                ).size;
                log('Dashboard', `Online members count: ${onlineMembers} (from cache)`, 'info');
            } catch (error) {
                log('Dashboard', `Failed to count online members: ${error.message}`, 'warning');
                onlineMembers = 0;
            }
    
            // 4. Banned Users: Jumlah pengguna yang dibanned di server saat ini
            const bans = await guild.bans.fetch();
            const bannedMembers = bans.size;
    
            // Sub-nilai (contoh, bisa disesuaikan dengan data yang tersedia)
            const newGuildsLast30Minutes = 0; // Memerlukan logika tambahan untuk melacak server baru
            const membersLast24Hours = 0; // Memerlukan logika untuk melacak login
            const onlineLast30Minutes = 0; // Memerlukan logika untuk melacak login
            const bannedLast24Hours = 0; // Memerlukan logika untuk melacak ban
    
            // Ambil daftar channel dan role untuk digunakan di template lain
            const channels = guild.channels.cache
                .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice)
                .map(c => ({ id: c.id, name: c.name }))
                .sort((a, b) => a.name.localeCompare(b.name));
    
            const roles = guild.roles.cache
                .filter(r => !r.managed && r.id !== guild.id)
                .map(r => ({ id: r.id, name: r.name }))
                .sort((a, b) => a.name.localeCompare(b.name));
    
            res.render('dashboard', {
                guild,
                serverConfig,
                channels,
                roles,
                botGuildCount,
                totalMembers,
                onlineMembers,
                bannedMembers,
                newGuildsLast30Minutes,
                membersLast24Hours,
                onlineLast30Minutes,
                bannedLast24Hours
            });
        } catch (error) {
            log('Dashboard', `Failed to load dashboard for guild ${guildId}: ${error.message}`, 'error');
            res.status(500).send(`Failed to load dashboard: ${error.message}`);
        }
    });

    app.get('/dashboard/:guildId/welcome', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).send('Guild not found');
    
        const config = serverList[guildId]?.welcome || {
            enabled: false,
            channel: '',
            messageType: 'text',
            font: 'Default',
            title: 'Welcome to {server}',
            subtitle: 'You\'re member #{server_member_count}. Make sure to read #rules!',
            welcomeText: 'Hey {user}, selamat datang di {server}!',
            backgroundImage: '',
            backgroundColor: '#000000',
            overlayOpacity: 0.5,
            embedColor: '#5865f2',
            welcomeTextColor: '#ffffff',
            welcomeNeonColor: '#ff8c00',
            memberTextColor: '#ff8c00'
        };
    
        res.render('welcome', {
            guild,
            config,
            user: req.user,
            availableFonts // Kirim daftar font ke template
        });
    });

    app.post('/dashboard/:guildId/welcome', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const { enabled, channel, messageType, font, title, subtitle, welcomeText, backgroundImage, backgroundColor, overlayOpacity, embedColor, welcomeTextColor, welcomeNeonColor, memberTextColor } = req.body;

        if (!serverList[guildId]) serverList[guildId] = {};
        serverList[guildId].welcome = {
            enabled: enabled === 'on',
            channel: channel || '',
            messageType: messageType || 'text',
            font: font || 'Default',
            title: title || 'Welcome to {server}',
            subtitle: subtitle || 'You\'re member #{server_member_count}. Make sure to read #rules!',
            welcomeText: welcomeText || 'Hey {user}, selamat datang di {server}!', // Simpan welcome text
            backgroundImage: backgroundImage || '',
            backgroundColor: backgroundColor || '#000000',
            overlayOpacity: parseFloat(overlayOpacity) || 0.5,
            embedColor: embedColor || '#5865f2',
            welcomeTextColor: welcomeTextColor || '#ffffff',
            welcomeNeonColor: welcomeNeonColor || '#ff8c00',
            memberTextColor: memberTextColor || '#ff8c00'
        };

        saveServerList();
        res.redirect(`/dashboard/${guildId}`);
    });

    // Route untuk preview welcome message (digunakan untuk menghasilkan gambar welcome card)
    app.get('/dashboard/:guildId/welcome/preview', ensureAuthenticated, ensureAdmin, async (req, res) => {
        if (!canvasAvailable) {
            return res.status(503).send('Canvas module not available. Please install canvas dependencies.');
        }
        
        const guildId = req.params.guildId;
        console.log(`[WelcomePreview] Processing preview for guild ${guildId}`);
    
        const { font, title, subtitle, backgroundImage, backgroundColor, overlayOpacity, welcomeTextColor, welcomeNeonColor, memberTextColor } = req.query;
        console.log(`[WelcomePreview] Query parameters:`, req.query);
    
        const welcomeConfig = {
            font: font || 'Default',
            title: title || 'Welcome to {server}',
            subtitle: subtitle || 'You\'re member #{server_member_count}. Make sure to read #rules!',
            backgroundImage: backgroundImage || '',
            backgroundColor: backgroundColor || '#000000',
            overlayOpacity: parseFloat(overlayOpacity) || 0.5,
            welcomeTextColor: welcomeTextColor || '#ffffff',
            welcomeNeonColor: welcomeNeonColor || '#ff8c00',
            memberTextColor: memberTextColor || '#ff8c00'
        };
        console.log(`[WelcomePreview] Welcome config:`, welcomeConfig);
    
        try {
            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');
    
            // Load background
            let background;
            try {
                const backgroundUrl = welcomeConfig.backgroundImage && welcomeConfig.backgroundImage.trim() !== '' 
                    ? decodeURIComponent(welcomeConfig.backgroundImage) 
                    : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c';
                console.log(`[WelcomePreview] Loading background from: ${backgroundUrl}`);
                background = await loadImage(backgroundUrl);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.warn(`[WelcomePreview] Failed to load background image: ${error.message}`);
                ctx.fillStyle = welcomeConfig.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
    
            // Tambah overlay dengan opacity
            ctx.fillStyle = `rgba(0, 0, 0, ${welcomeConfig.overlayOpacity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            // Load avatar user
            const avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
            console.log(`[WelcomePreview] Loading avatar from: ${avatarUrl}`);
            const avatar = await loadImage(avatarUrl);
    
            // Gambar avatar dalam lingkaran
            const avatarSize = 128;
            const avatarX = (canvas.width - avatarSize) / 2;
            const avatarY = 20;
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
    
            // Tambah border lingkaran dengan efek neon
            ctx.strokeStyle = welcomeConfig.welcomeNeonColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.stroke();
    
            // Tambah teks title
            const fontFamily = welcomeConfig.font === 'default' ? 'Sans' : welcomeConfig.font;
            console.log(`[WelcomePreview] Using font for title: ${fontFamily}`);
            ctx.font = `bold 36px "${fontFamily}", Sans`; // Tambahkan Sans sebagai fallback
            ctx.fillStyle = welcomeConfig.welcomeTextColor;
            ctx.textAlign = 'center';
            const titleText = decodeURIComponent(welcomeConfig.title).replace('{server}', 'ChillZone ID');
            ctx.fillText(titleText, canvas.width / 2, 180);
    
            // Tambah teks subtitle
            console.log(`[WelcomePreview] Using font for subtitle: ${fontFamily}`);
            ctx.font = `24px "${fontFamily}", Sans`; // Tambahkan Sans sebagai fallback
            ctx.fillStyle = welcomeConfig.memberTextColor;
            const subtitleText = decodeURIComponent(welcomeConfig.subtitle)
                .replace('{server_member_count}', '842')
                .replace(/#rules/i, '#📜〢・rules')
                .toUpperCase();
            ctx.fillText(subtitleText, canvas.width / 2, 220);
    
            // Convert canvas ke buffer
            const buffer = canvas.toBuffer('image/png');
            res.set('Content-Type', 'image/png');
            res.send(buffer);
        } catch (error) {
            console.error(`[WelcomePreview] Error generating preview: ${error.message}`);
            console.error(error.stack);
            res.status(500).send('Error generating preview');
        }
    });

    // Event listener untuk guildMemberAdd
    client.on('guildMemberAdd', async (member) => {
        const guildId = member.guild.id;
    
        // Handle Auto Roles
        const autoRolesConfig = serverList[guildId]?.autoRoles;
        if (autoRolesConfig?.enabled) {
            try {
                const { joinRole, botRole } = autoRolesConfig;
    
                // Cek apakah member adalah bot
                if (member.user.bot && botRole) {
                    const role = member.guild.roles.cache.get(botRole);
                    if (role) {
                        await member.roles.add(role);
                        log('AutoRoles', `Added bot role ${role.name} to ${member.user.tag} in guild ${guildId}`, 'success');
                    } else {
                        log('AutoRoles', `Bot role ${botRole} not found in guild ${guildId}`, 'warning');
                    }
                } else if (!member.user.bot && joinRole) {
                    const role = member.guild.roles.cache.get(joinRole);
                    if (role) {
                        await member.roles.add(role);
                        log('AutoRoles', `Added join role ${role.name} to ${member.user.tag} in guild ${guildId}`, 'success');
                    } else {
                        log('AutoRoles', `Join role ${joinRole} not found in guild ${guildId}`, 'warning');
                    }
                }
            } catch (error) {
                log('AutoRoles', `Error assigning role to ${member.user.tag} in guild ${guildId}: ${error.message}`, 'error');
            }
        }
    
        // Handle Welcome Message (logika yang sudah ada)
        const welcomeConfig = serverList[guildId]?.welcome;
        if (!welcomeConfig || !welcomeConfig.enabled || !welcomeConfig.channel) {
            console.log(`[GuildMemberAdd] Welcome message not enabled or channel not set for guild ${guildId}`);
            return;
        }
        
        if (!canvasAvailable) {
            console.log(`[GuildMemberAdd] Canvas not available, skipping welcome image for guild ${guildId}`);
            // Send simple text welcome instead
            const channel = member.guild.channels.cache.get(welcomeConfig.channel);
            if (channel) {
                try {
                    await channel.send(
                        (welcomeConfig.welcomeText || 'Hey {user}, selamat datang di {server}!')
                            .replace('{user}', member.user.toString())
                            .replace('{server}', member.guild.name)
                    );
                } catch (error) {
                    console.error(`[GuildMemberAdd] Error sending text welcome: ${error.message}`);
                }
            }
            return;
        }
    
        const channel = member.guild.channels.cache.get(welcomeConfig.channel);
        if (!channel) {
            console.log(`[GuildMemberAdd] Welcome channel ${welcomeConfig.channel} not found in guild ${guildId}`);
            return;
        }
    
        try {
            // Buat canvas untuk pesan selamat datang dengan gambar
            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');
    
            // Load background
            let background;
            try {
                const backgroundUrl = welcomeConfig.backgroundImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c';
                console.log(`[GuildMemberAdd] Loading background from: ${backgroundUrl}`);
                background = await loadImage(backgroundUrl);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.warn(`[GuildMemberAdd] Failed to load background image: ${error.message}`);
                ctx.fillStyle = welcomeConfig.backgroundColor || '#000000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
    
            // Tambah overlay dengan opacity
            ctx.fillStyle = `rgba(0, 0, 0, ${welcomeConfig.overlayOpacity || 0.5})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            // Load avatar user
            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
            console.log(`[GuildMemberAdd] Loading avatar from: ${avatarUrl}`);
            const avatar = await loadImage(avatarUrl);
    
            // Gambar avatar dalam lingkaran
            const avatarSize = 128;
            const avatarX = (canvas.width - avatarSize) / 2;
            const avatarY = 20;
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
    
            // Tambah border lingkaran dengan efek neon
            ctx.strokeStyle = welcomeConfig.welcomeNeonColor || '#ff8c00';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.stroke();
    
            // Tambah teks title
            const fontFamily = welcomeConfig.font === 'Default' ? 'Sans' : welcomeConfig.font;
            console.log(`[GuildMemberAdd] Using font for title: ${fontFamily}`);
            ctx.font = `bold 36px "${fontFamily}", Sans`; // Tambahkan Sans sebagai fallback
            ctx.fillStyle = welcomeConfig.welcomeTextColor || '#ffffff';
            ctx.textAlign = 'center';
            const titleText = (welcomeConfig.title || 'Welcome to {server}').replace('{server}', member.guild.name);
            ctx.fillText(titleText, canvas.width / 2, 180);
    
            // Tambah teks subtitle
            console.log(`[GuildMemberAdd] Using font for subtitle: ${fontFamily}`);
            ctx.font = `24px "${fontFamily}", Sans`; // Tambahkan Sans sebagai fallback
            ctx.fillStyle = welcomeConfig.memberTextColor || '#ff8c00';
            const rulesChannel = member.guild.channels.cache.find(ch => ch.name.includes('rules'))?.id || '997672048463720448'; // Ganti dengan ID channel #rules
            const subtitleText = (welcomeConfig.subtitle || 'You are member #{server_member_count}. Make sure to read #rules!')
                .replace('{server_member_count}', member.guild.memberCount)
                .replace(/#rules/i, `<#${rulesChannel}>`)
                .toUpperCase();
            ctx.fillText(subtitleText, canvas.width / 2, 220);
    
            // Convert canvas ke buffer
            const { AttachmentBuilder } = require('discord.js');
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });
    
            // Kirim pesan selamat datang berdasarkan messageType
            if (welcomeConfig.messageType === 'embed') {
                const embed = new EmbedBuilder()
                    .setTitle(titleText)
                    .setDescription(
                        (welcomeConfig.welcomeText || 'Hey {user}, selamat datang di {server}!')
                            .replace('{user}', member.user.toString())
                            .replace('{server}', member.guild.name)
                    )
                    .setColor(welcomeConfig.embedColor || '#5865f2')
                    .setImage('attachment://welcome-image.png')
                    .setTimestamp();
    
                await channel.send({ embeds: [embed], files: [attachment] });
                console.log(`[GuildMemberAdd] Sent embed welcome message with image for ${member.user.tag} in guild ${guildId}`);
            } else {
                await channel.send({
                    content: (welcomeConfig.welcomeText || 'Hey {user}, selamat datang di {server}!')
                        .replace('{user}', member.user.toString())
                        .replace('{server}', member.guild.name),
                    files: [attachment]
                });
                console.log(`[GuildMemberAdd] Sent text welcome message with image for ${member.user.tag} in guild ${guildId}`);
            }
        } catch (error) {
            console.error(`[GuildMemberAdd] Error sending welcome message for ${member.user.tag} in guild ${guildId}: ${error.message}`);
        }
    });

    // Fungsi untuk mengonversi hex color ke ButtonStyle
    function hexToButtonStyle(hexColor) {
        // Default ke Secondary jika hexColor tidak valid
        if (!hexColor || !hexColor.startsWith('#') || hexColor.length !== 7) {
            return ButtonStyle.Secondary;
        }

        // Konversi hex ke RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);

        // Tentukan warna dominan
        const max = Math.max(r, g, b);

        if (max === r && r > 150) {
            // Dominan merah -> Danger
            return ButtonStyle.Danger;
        } else if (max === g && g > 150) {
            // Dominan hijau -> Success
            return ButtonStyle.Success;
        } else if (max === b && b > 150) {
            // Dominan biru -> Primary
            return ButtonStyle.Primary;
        } else {
            // Warna lain atau tidak cukup dominan -> Secondary
            return ButtonStyle.Secondary;
        }
    }

    app.get('/dashboard/:guildId/rules', ensureAuthenticated, ensureAdmin, (req, res) => {
        const guildId = req.params.guildId;
        log('Rules', `Loading rules for guild ${guildId}`, 'info');
    
        // Pastikan serverList[guildId] ada
        if (!serverList[guildId]) serverList[guildId] = {};
        
        // Ambil konfigurasi rules, gunakan default jika tidak ada
        const config = {
            enabled: serverList[guildId]?.rules?.enabled || false,
            channel: serverList[guildId]?.rules?.channel || '',
            html: serverList[guildId]?.rules?.html || '',
            markdown: serverList[guildId]?.rules?.markdown || '',
            image: serverList[guildId]?.rules?.image || '',
            embedColor: serverList[guildId]?.rules?.embedColor || '#FF0000',
            buttonColor: serverList[guildId]?.rules?.buttonColor || '#5865F2', // Pastikan default value
            role1: serverList[guildId]?.rules?.role1 || '',
            role2: serverList[guildId]?.rules?.role2 || null
        };
        
        log('Rules', `Loaded rules config for guild ${guildId}: ${JSON.stringify(config)}`, 'info');
    
        // Ambil daftar emoji
        const emojis = req.guild.emojis.cache.map(emoji => ({
            name: emoji.name,
            id: emoji.id,
            string: emoji.toString(),
            url: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?size=32`
        }));
    
        res.render('rules', { guild: req.guild, config, emojis });
    });

    app.get('/dashboard/:guildId/roles', ensureAuthenticated, ensureAdmin, (req, res) => {
        const guildId = req.params.guildId;
        const config = serverList[guildId]?.roles || { embedColor: '#5865f2', categories: [] };
        res.render('roles', { guild: req.guild, config });
    });

    app.get('/dashboard/:guildId/rankcard', ensureAuthenticated, ensureAdmin, (req, res) => {
        const guildId = req.params.guildId;
        ensureGuildConfig(guildId);
        initRankCard(guildId);
        const config = serverList[guildId]?.rankCard || {
            font: 'Default',
            mainColor: '#FFFFFF',
            backgroundColor: '#000000',
            overlayOpacity: 0.5,
            backgroundImage: ''
        };
        res.render('rankcard', {
            guild: req.guild,
            config,
            availableFonts // Kirim daftar font ke template
        });
    });

    app.post('/dashboard/:guildId/rankcard', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const { font, mainColor, backgroundColor, overlayOpacity, backgroundImage } = req.body;

        ensureGuildConfig(guildId);
        serverList[guildId].rankCard = {
            font: font || 'Default',
            mainColor: mainColor || '#FFFFFF',
            backgroundColor: backgroundColor || '#000000',
            overlayOpacity: parseFloat(overlayOpacity) || 0.5,
            backgroundImage: backgroundImage || ''
        };

        saveServerList();
        res.redirect(`/dashboard/${guildId}`);
    });

    app.get('/dashboard/:guildId/rankcard/preview', ensureAuthenticated, ensureAdmin, async (req, res) => {
        if (!canvasAvailable) {
            return res.status(503).send('Canvas module not available. Please install canvas dependencies.');
        }
        
        const guildId = req.params.guildId;
        const { font, mainColor, backgroundColor, overlayOpacity, backgroundImage } = req.query;
    
        const rankCardConfig = {
            font: font || 'Default',
            mainColor: mainColor || '#FFFFFF',
            backgroundColor: backgroundColor || '#000000',
            overlayOpacity: parseFloat(overlayOpacity) || 0.5,
            backgroundImage: backgroundImage || ''
        };
    
        try {
            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');
    
            // Load background
            let background;
            try {
                const backgroundUrl = rankCardConfig.backgroundImage || 'https://s6.gifyu.com/images/bbXYO.gif';
                console.log(`[RankCardPreview] Loading background from: ${backgroundUrl}`);
                background = await loadImage(backgroundUrl);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.warn(`[RankCardPreview] Failed to load background image: ${error.message}`);
                ctx.fillStyle = rankCardConfig.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
    
            // Tambah overlay dengan opacity
            ctx.fillStyle = `rgba(0, 0, 0, ${rankCardConfig.overlayOpacity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
    
            // Load avatar user
            const avatarUrl = 'https://cdn.discordapp.com/embed/avatars/0.png';
            console.log(`[RankCardPreview] Loading avatar from: ${avatarUrl}`);
            const avatar = await loadImage(avatarUrl);
    
            // Gambar avatar dalam lingkaran
            const avatarSize = 128;
            const avatarX = 50;
            const avatarY = (canvas.height - avatarSize) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
    
            // Tambah border lingkaran
            ctx.strokeStyle = rankCardConfig.mainColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.stroke();
    
            // Gunakan font yang dipilih
            const fontFamily = rankCardConfig.font === 'Default' ? 'Sans' : rankCardConfig.font;
            console.log(`[RankCardPreview] Using font: ${fontFamily}`);
    
            // Tambah teks username
            ctx.font = `bold 36px "${fontFamily}", Sans`; // Tambahkan Sans sebagai fallback
            ctx.fillStyle = rankCardConfig.mainColor;
            ctx.textAlign = 'left';
            ctx.fillText('PreviewUser#0000', 200, 60);
    
            // Tambah teks rank dan level
            ctx.font = `24px "${fontFamily}", Sans`; // Tambahkan Sans sebagai fallback
            ctx.fillText('Rank #1', 200, 100);
            ctx.fillText('Level 10', 400, 100);
            ctx.fillText('Coins: 1000', 200, 140);
    
            // Gambar XP bar
            const barWidth = 300;
            const barHeight = 20;
            const barX = 200;
            const barY = 170;
            const xpProgress = 0.5;
            ctx.fillStyle = rankCardConfig.mainColor;
            ctx.fillRect(barX, barY, xpProgress * barWidth, barHeight);
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(barX, barY, barWidth, barHeight);
    
            // Tambah teks XP
            ctx.font = `16px "${fontFamily}", Sans`; // Tambahkan Sans sebagai fallback
            ctx.fillText('500/1000 XP', 200, barY + 40);
    
            // Convert canvas ke buffer
            const buffer = canvas.toBuffer('image/png');
            res.set('Content-Type', 'image/png');
            res.send(buffer);
        } catch (error) {
            console.error(`[RankCardPreview] Error generating preview: ${error.message}`);
            res.status(500).send('Error generating preview');
        }
    });

    app.post('/dashboard/:guildId/rules', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return res.status(404).send('Guild not found');

        const { enabled, channel, rules, image, embedColor, buttonColor, role1, role2 } = req.body;

        const markdownRules = htmlToMd(rules);
        log('Rules', `Converted rules to Markdown for guild ${guildId}:\n${markdownRules}`, 'info');

        if (!serverList[guildId]) serverList[guildId] = {};
        serverList[guildId].rules = {
            enabled: enabled === 'on',
            channel,
            html: rules,
            markdown: markdownRules,
            image,
            embedColor: embedColor || '#FF0000',
            buttonColor: buttonColor || '#5865F2',
            role1,
            role2: role2 || null
        };

        try {
            saveServerList();
            log('Rules', `Successfully saved rules for guild ${guildId}`, 'success');
        } catch (error) {
            log('Rules', `Failed to save rules for guild ${guildId}: ${error.message}`, 'error');
            return res.status(500).send('Failed to save rules due to a server error. Please try again.');
        }

        if (enabled === 'on' && channel) {
            try {
                const rulesChannel = guild.channels.cache.get(channel);
                if (!rulesChannel) {
                    log('Rules', `Channel ${channel} not found in guild ${guildId}`, 'error');
                    return res.redirect(`/dashboard/${guildId}`);
                }
    
                // Hapus pesan lama dari bot
                log('Rules', `Fetching messages in channel ${channel} to delete old bot messages`, 'info');
                const messages = await rulesChannel.messages.fetch({ limit: 10 });
                const botMessages = messages.filter(msg => msg.author.id === client.user.id);
                if (botMessages.size > 0) {
                    await rulesChannel.bulkDelete(botMessages);
                    log('Rules', `Deleted ${botMessages.size} old messages in channel ${channel}`, 'info');
                }
    
                // Kirim gambar (jika ada)
                if (image) {
                    log('Rules', `Sending image to channel ${channel} in guild ${guildId}`, 'info');
                    await rulesChannel.send({ files: [image] });
                    log('Rules', `Sent image to channel ${channel} in guild ${guildId}`, 'success');
                }
    
                // Validasi panjang description embed
                const maxEmbedDescriptionLength = 4096;
                let truncatedMarkdownRules = markdownRules;
                if (markdownRules.length > maxEmbedDescriptionLength) {
                    log('Rules', `Markdown rules too long (${markdownRules.length} characters), truncating to ${maxEmbedDescriptionLength} characters`, 'warning');
                    truncatedMarkdownRules = markdownRules.substring(0, maxEmbedDescriptionLength - 3) + '...';
                }
    
                // Kirim embed rules dengan tombol
                const embed = new EmbedBuilder()
                    .setTitle(`${guild.name} Rules`)
                    .setDescription(truncatedMarkdownRules)
                    .setColor(embedColor || '#FF0000')
                    .setTimestamp();
    
                // Konversi buttonColor ke ButtonStyle
                const buttonStyle = hexToButtonStyle(buttonColor);
                log('Rules', `Using button style ${buttonStyle} for buttonColor ${buttonColor}`, 'info');
    
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('accept_rules')
                        .setLabel('Accept Rules')
                        .setStyle(buttonStyle) // Gunakan buttonStyle berdasarkan buttonColor
                );
    
                log('Rules', `Sending rules embed to channel ${channel} in guild ${guildId}`, 'info');
                await rulesChannel.send({ embeds: [embed], components: [row] });
                log('Rules', `Successfully sent rules embed to channel ${channel} in guild ${guildId}`, 'success');
            } catch (error) {
                log('Rules', `Failed to send rules embed to channel ${channel} in guild ${guildId}: ${error.message}`, 'error');
                // Lanjutkan ke redirect meskipun gagal mengirim pesan
            }
        }    

        res.redirect(`/dashboard/${guildId}`);
    });

    app.post('/dashboard/:guildId/roles', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const { enabled, channel, categories, embedColor } = req.body;
        const parsedCategories = JSON.parse(categories);

        if (!serverList[guildId]) serverList[guildId] = {};
        serverList[guildId].roles = {
            enabled: enabled === 'on',
            channel,
            categories: parsedCategories,
            embedColor: embedColor || '#5865f2'
        };

        if (enabled === 'on' && channel) {
            try {
                const rolesChannel = client.guilds.cache.get(guildId).channels.cache.get(channel);
                if (!rolesChannel) {
                    log('Roles', `Channel ${channel} not found in guild ${guildId}`, 'error');
                    return res.redirect(`/dashboard/${guildId}`);
                }

                const messages = await rolesChannel.messages.fetch({ limit: 10 });
                const botMessages = messages.filter(msg => msg.author.id === client.user.id);
                if (botMessages.size > 0) {
                    await rolesChannel.bulkDelete(botMessages);
                    log('Roles', `Deleted ${botMessages.size} old messages in channel ${channel}`, 'info');
                }

                for (const category of parsedCategories) {
                    const roleList = category.roles.map(role => `${role.emoji || ''} ${role.name}`.trim()).join('\n');
                    const description = roleList || 'No roles available in this category.';

                    const embed = new EmbedBuilder()
                        .setTitle(category.name)
                        .setDescription(description)
                        .setColor(embedColor || '#5865f2')
                        .setTimestamp();

                    if (category.image) {
                        embed.setImage(category.image);
                    }

                    const selectMenu = new SelectMenuBuilder()
                        .setCustomId(`select-role-${category.name.toLowerCase().replace(/\s+/g, '-')}`)
                        .setPlaceholder('Select a role...')
                        .addOptions(
                            category.roles.map(role =>
                                new SelectMenuOptionBuilder()
                                    .setLabel(`${role.emoji || ''} ${role.name}`.trim())
                                    .setValue(role.name)
                            )
                        );

                    const row = new ActionRowBuilder().addComponents(selectMenu);

                    await rolesChannel.send({ embeds: [embed], components: [row] });
                    log('Roles', `Sent role embed for category ${category.name} to channel ${channel}`, 'success');
                }
            } catch (error) {
                log('Roles', `Failed to send role embeds to channel ${channel} in guild ${guildId}: ${error.message}`, 'error');
            }
        }

        saveServerList();
        res.redirect(`/dashboard/${guildId}`);
    });

    // Rute untuk halaman Auto Roles
    app.get('/dashboard/:guildId/autoroles', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        log('AutoRoles', `Accessing /dashboard/${guildId}/autoroles for user: ${req.user.id}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('AutoRoles', `Guild ${guildId} not found`, 'error');
            return res.redirect('/servers');
        }

        // Pastikan serverList[guildId] ada
        if (!serverList[guildId]) serverList[guildId] = {};

        // Ambil konfigurasi autoRoles, gunakan default jika tidak ada
        const config = serverList[guildId]?.autoRoles || {
            enabled: false,
            joinRole: null,
            botRole: null
        };

        res.render('autoroles', { guild: req.guild, config });
    });

    // Rute untuk menyimpan pengaturan Auto Roles
    app.post('/dashboard/:guildId/autoroles', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        log('AutoRoles', `Saving auto roles settings for guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('AutoRoles', `Guild ${guildId} not found`, 'error');
            return res.redirect('/servers');
        }

        const { enabled, joinRole, botRole } = req.body;

        // Pastikan serverList[guildId] ada
        if (!serverList[guildId]) serverList[guildId] = {};

        // Simpan konfigurasi autoRoles
        serverList[guildId].autoRoles = {
            enabled: enabled === 'on',
            joinRole: joinRole || null,
            botRole: botRole || null
        };

        try {
            saveServerList();
            log('AutoRoles', `Successfully saved auto roles settings for guild ${guildId}`, 'success');
        } catch (error) {
            log('AutoRoles', `Failed to save auto roles settings for guild ${guildId}: ${error.message}`, 'error');
            return res.status(500).send('Failed to save auto roles settings due to a server error. Please try again.');
        }

        res.redirect(`/dashboard/${guildId}/autoroles`);
    });

    // GET Route untuk Halaman Automod
    app.get('/dashboard/:guildId/automod', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        log('Automod', `Accessing automod settings for guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Automod', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }

        // Default config dengan struktur lengkap
        const defaultConfig = {
            automod: {
                enabled: false, // Tambahkan enabled di level automod
                antiSpam: { enabled: false, messages: 5, seconds: 5, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                antiInvite: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                antiLinks: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                mentionsSpam: { enabled: false, maxMentions: 5, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                capsSpam: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] }
            }
        };

        // Ambil config dari serverList, atau gunakan default jika tidak ada
        const config = serverList[guildId] || defaultConfig;
        if (!config.automod) {
            config.automod = defaultConfig.automod;
        }

        res.render('automod', {
            user: req.user,
            guild,
            config,
            activeMenu: { automod: true }
        });
    });

    // POST Route untuk Toggle Enable/Disable Semua Automod
    app.post('/dashboard/:guildId/automod/toggle/all', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        log('Automod', `Toggling all automod features for guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Automod', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }

        const { automodEnabled } = req.body;

        try {
            if (!serverList[guildId]) serverList[guildId] = {};
            if (!serverList[guildId].automod) serverList[guildId].automod = {
                enabled: false,
                antiSpam: { enabled: false, messages: 5, seconds: 5, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                antiInvite: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                antiLinks: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                mentionsSpam: { enabled: false, maxMentions: 5, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                capsSpam: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] }
            };

            // Update status automod.enabled
            serverList[guildId].automod.enabled = automodEnabled === 'on';

            await saveServerList();
            log('Automod', `Successfully toggled all automod features for guild ${guildId}`, 'success');
            res.redirect(`/dashboard/${guildId}/automod`);
        } catch (error) {
            log('Automod', `Failed to toggle all automod features for guild ${guildId}: ${error.message}`, 'error');
            res.status(500).send(`Failed to toggle all automod features: ${error.message}`);
        }
    });

    // POST Route untuk Toggle Enable/Disable Fitur
    app.post('/dashboard/:guildId/automod/toggle/:feature', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const feature = req.params.feature;
        log('Automod', `Toggling ${feature} for guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Automod', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }

        const { antiSpamEnabled, antiInviteEnabled, antiLinksEnabled, mentionsSpamEnabled, capsSpamEnabled } = req.body;

        try {
            if (!serverList[guildId]) serverList[guildId] = {};
            if (!serverList[guildId].automod) serverList[guildId].automod = {
                enabled: false,
                antiSpam: { enabled: false, messages: 5, seconds: 5, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                antiInvite: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                antiLinks: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                mentionsSpam: { enabled: false, maxMentions: 5, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] },
                capsSpam: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [] }
            };

            switch (feature) {
                case 'antiSpam':
                    serverList[guildId].automod.antiSpam.enabled = antiSpamEnabled === 'on';
                    break;
                case 'antiInvite':
                    serverList[guildId].automod.antiInvite.enabled = antiInviteEnabled === 'on';
                    break;
                case 'antiLinks':
                    serverList[guildId].automod.antiLinks.enabled = antiLinksEnabled === 'on';
                    break;
                case 'mentionsSpam':
                    serverList[guildId].automod.mentionsSpam.enabled = mentionsSpamEnabled === 'on';
                    break;
                case 'capsSpam':
                    serverList[guildId].automod.capsSpam.enabled = capsSpamEnabled === 'on';
                    break;
                default:
                    return res.status(400).send('Invalid feature');
            }

            await saveServerList();
            log('Automod', `Successfully toggled ${feature} for guild ${guildId}`, 'success');
            res.redirect(`/dashboard/${guildId}/automod`);
        } catch (error) {
            log('Automod', `Failed to toggle ${feature} for guild ${guildId}: ${error.message}`, 'error');
            res.status(500).send(`Failed to toggle ${feature}: ${error.message}`);
        }
    });

    // GET Route untuk Halaman Edit
    app.get('/dashboard/:guildId/automod/edit/:feature', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const feature = req.params.feature;
        log('Automod', `Accessing edit page for ${feature} in guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Automod', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }

        // Ambil data channels dan roles untuk whitelist
        const channels = guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildText) // Gunakan ChannelType.GuildText
            .map(channel => ({ id: channel.id, name: channel.name }));

        const roles = guild.roles.cache
            .filter(role => !role.managed && role.name !== '@everyone')
            .map(role => ({ id: role.id, name: role.name }));

        // Default config dengan struktur lengkap
        const defaultConfig = {
            enabled: false,
            antiSpam: { enabled: false, messages: 5, seconds: 5, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [], punishmentType: 'timeout' },
            antiInvite: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [], punishmentType: 'timeout' },
            antiLinks: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [], punishmentType: 'timeout' },
            mentionsSpam: { enabled: false, maxMentions: 5, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [], punishmentType: 'timeout' },
            capsSpam: { enabled: false, timeout: { duration: 60, unit: 'seconds' }, channelWhitelist: [], roleWhitelist: [], punishmentType: 'timeout' }
        };

        // Ambil config dari serverList, atau gunakan default jika tidak ada
        const config = serverList[guildId]?.automod || defaultConfig;

        const validFeatures = ['antiSpam', 'antiInvite', 'antiLinks', 'mentionsSpam', 'capsSpam'];
        if (!validFeatures.includes(feature)) {
            return res.status(400).send('Invalid feature');
        }

        res.render(`automod/${feature}`, {
            user: req.user,
            guild,
            config,
            channels,
            roles,
            activeMenu: { automod: true }
        });
    });

    // POST Route untuk Menyimpan Pengaturan dari Halaman Edit
    app.post('/dashboard/:guildId/automod/edit/:feature', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const feature = req.params.feature;
        log('Automod', `Saving ${feature} settings for guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Automod', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }

        const {
            antiSpamMessages, antiSpamSeconds, antiSpamTimeoutDuration, antiSpamTimeoutUnit, antiSpamChannelWhitelist, antiSpamRoleWhitelist,
            antiInviteTimeoutDuration, antiInviteTimeoutUnit, antiInviteChannelWhitelist, antiInviteRoleWhitelist,
            antiLinksTimeoutDuration, antiLinksTimeoutUnit, antiLinksChannelWhitelist, antiLinksRoleWhitelist, antiLinksLinksWhitelist,
            mentionsSpamMaxMentions, mentionsSpamTimeoutDuration, mentionsSpamTimeoutUnit, mentionsSpamChannelWhitelist, mentionsSpamRoleWhitelist,
            capsSpamTimeoutDuration, capsSpamTimeoutUnit, capsSpamChannelWhitelist, capsSpamRoleWhitelist,
            punishmentType
        } = req.body;

        try {
            // Pastikan serverList[guildId] ada
            ensureGuildConfig(guildId);

            const validFeatures = ['antiSpam', 'antiInvite', 'antiLinks', 'mentionsSpam', 'capsSpam'];
            if (!validFeatures.includes(feature)) {
                return res.status(400).send('Invalid feature');
            }

            switch (feature) {
                case 'antiSpam':
                    serverList[guildId].automod.antiSpam = {
                        ...serverList[guildId].automod.antiSpam,
                        messages: parseInt(antiSpamMessages) || 5,
                        seconds: parseInt(antiSpamSeconds) || 5,
                        timeout: { duration: parseInt(antiSpamTimeoutDuration) || 60, unit: antiSpamTimeoutUnit || 'seconds' },
                        channelWhitelist: Array.isArray(antiSpamChannelWhitelist) ? antiSpamChannelWhitelist : (antiSpamChannelWhitelist ? [antiSpamChannelWhitelist] : []),
                        roleWhitelist: Array.isArray(antiSpamRoleWhitelist) ? antiSpamRoleWhitelist : (antiSpamRoleWhitelist ? [antiSpamRoleWhitelist] : []),
                        punishmentType: punishmentType || 'timeout'
                    };
                    break;
                case 'antiInvite':
                    serverList[guildId].automod.antiInvite = {
                        ...serverList[guildId].automod.antiInvite,
                        timeout: { duration: parseInt(antiInviteTimeoutDuration) || 60, unit: antiInviteTimeoutUnit || 'seconds' },
                        channelWhitelist: Array.isArray(antiInviteChannelWhitelist) ? antiInviteChannelWhitelist : (antiInviteChannelWhitelist ? [antiInviteChannelWhitelist] : []),
                        roleWhitelist: Array.isArray(antiInviteRoleWhitelist) ? antiInviteRoleWhitelist : (antiInviteRoleWhitelist ? [antiInviteRoleWhitelist] : []),
                        punishmentType: punishmentType || 'timeout'
                    };
                    break;
                case 'antiLinks':
                    serverList[guildId].automod.antiLinks = {
                        ...serverList[guildId].automod.antiLinks,
                        timeout: { duration: parseInt(antiLinksTimeoutDuration) || 60, unit: antiLinksTimeoutUnit || 'seconds' },
                        channelWhitelist: Array.isArray(antiLinksChannelWhitelist) ? antiLinksChannelWhitelist : (antiLinksChannelWhitelist ? [antiLinksChannelWhitelist] : []),
                        roleWhitelist: Array.isArray(antiLinksRoleWhitelist) ? antiLinksRoleWhitelist : (antiLinksRoleWhitelist ? [antiLinksRoleWhitelist] : []),
                        linksWhitelist: antiLinksLinksWhitelist ? antiLinksLinksWhitelist.split('\n').map(link => link.trim()).filter(link => link) : [],
                        punishmentType: punishmentType || 'timeout'
                    };
                    break;
                case 'mentionsSpam':
                    serverList[guildId].automod.mentionsSpam = {
                        ...serverList[guildId].automod.mentionsSpam,
                        maxMentions: parseInt(mentionsSpamMaxMentions) || 5,
                        timeout: { duration: parseInt(mentionsSpamTimeoutDuration) || 60, unit: mentionsSpamTimeoutUnit || 'seconds' },
                        channelWhitelist: Array.isArray(mentionsSpamChannelWhitelist) ? mentionsSpamChannelWhitelist : (mentionsSpamChannelWhitelist ? [mentionsSpamChannelWhitelist] : []),
                        roleWhitelist: Array.isArray(mentionsSpamRoleWhitelist) ? mentionsSpamRoleWhitelist : (mentionsSpamRoleWhitelist ? [mentionsSpamRoleWhitelist] : []),
                        punishmentType: punishmentType || 'timeout'
                    };
                    break;
                case 'capsSpam':
                    serverList[guildId].automod.capsSpam = {
                        ...serverList[guildId].automod.capsSpam,
                        timeout: { duration: parseInt(capsSpamTimeoutDuration) || 60, unit: capsSpamTimeoutUnit || 'seconds' },
                        channelWhitelist: Array.isArray(capsSpamChannelWhitelist) ? capsSpamChannelWhitelist : (capsSpamChannelWhitelist ? [capsSpamChannelWhitelist] : []),
                        roleWhitelist: Array.isArray(capsSpamRoleWhitelist) ? capsSpamRoleWhitelist : (capsSpamRoleWhitelist ? [capsSpamRoleWhitelist] : []),
                        punishmentType: punishmentType || 'timeout'
                    };
                    break;
            }

            await saveServerList();
            log('Automod', `Successfully saved ${feature} settings for guild ${guildId}`, 'success');
            res.redirect(`/dashboard/${guildId}/automod`);
        } catch (error) {
            log('Automod', `Failed to save ${feature} settings for guild ${guildId}: ${error.message}`, 'error');
            res.status(500).send(`Failed to save ${feature} settings: ${error.message}`);
        }
    });
    // Route untuk menampilkan halaman levels
    app.get('/dashboard/:guildId/levels', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        log('Levels', `Accessing levels settings for guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Levels', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }

        try {
            // Pastikan serverList[guildId] ada
            ensureGuildConfig(guildId);

            const config = serverList[guildId];

            // Ambil daftar channel dan role
            const channels = guild.channels.cache
                .filter(c => c.type === ChannelType.GuildText) // Gunakan ChannelType.GuildText
                .map(c => ({ id: c.id, name: c.name }))
                .sort((a, b) => a.name.localeCompare(b.name));

            const roles = guild.roles.cache
                .filter(r => !r.managed && r.id !== guild.id)
                .map(r => ({ id: r.id, name: r.name }))
                .sort((a, b) => a.name.localeCompare(b.name));

            res.render('levels', {
                guild,
                config,
                channels,
                roles
            });
        } catch (error) {
            log('Levels', `Failed to load levels settings for guild ${guildId}: ${error.message}`, 'error');
            res.status(500).send(`Failed to load levels settings: ${error.message}`);
        }
    });

    // Route untuk menyimpan pengaturan levels
    app.post('/dashboard/:guildId/levels', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        log('Levels', `Saving levels settings for guild: ${guildId}`);
    
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Levels', `Guild ${guildId} not found`, 'error');
            return res.redirect('/servers');
        }
    
        // Pastikan serverList[guildId] ada
        if (!serverList[guildId]) serverList[guildId] = {};
    
        // Ambil data dari form
        const {
            levelsEnabled, xpRate, noExtraXPForPro, levelChannel, levelMessage,
            roleRewardType, removeRoleOnXPLoss, roleRewardLevel, roleRewardId,
            noXPRolesMode, noXPRoles, noXPChannelsMode, noXPChannels,
            giveXPCommandEnabled, levelsCommandEnabled, rankCommandEnabled, removeXPCommandEnabled
        } = req.body;
    
        // Simpan konfigurasi levels
        serverList[guildId].levels = {
            enabled: levelsEnabled === 'on',
            xpRate: parseFloat(xpRate) || 1,
            noExtraXPForPro: noExtraXPForPro === 'on',
            levelChannel: levelChannel || null,
            levelMessage: levelMessage || 'GG [player], kamu baru saja naik ke level [level]!',
            roleRewardType: roleRewardType || 'stack',
            removeRoleOnXPLoss: removeRoleOnXPLoss === 'on',
            roleRewards: Array.isArray(roleRewardLevel) && Array.isArray(roleRewardId)
                ? roleRewardLevel.map((level, index) => ({
                      level: parseInt(level),
                      roleId: roleRewardId[index]
                  })).filter(reward => reward.level && reward.roleId)
                : [],
            noXPRolesMode: noXPRolesMode || 'allowAll',
            noXPRoles: Array.isArray(noXPRoles) ? noXPRoles.filter(id => id) : [],
            noXPChannelsMode: noXPChannelsMode || 'allowAll',
            noXPChannels: Array.isArray(noXPChannels) ? noXPChannels.filter(id => id) : [],
            commands: {
                giveXP: { enabled: giveXPCommandEnabled === 'on' },
                levels: { enabled: levelsCommandEnabled === 'on' },
                rank: { enabled: rankCommandEnabled === 'on' },
                removeXP: { enabled: removeXPCommandEnabled === 'on' }
            }
        };
    
        try {
            saveServerList(); // Simpan konfigurasi ke file atau database
            log('Levels', `Successfully saved levels settings for guild ${guildId}`, 'success');
        } catch (error) {
            log('Levels', `Failed to save levels settings for guild ${guildId}: ${error.message}`, 'error');
            return res.status(500).send('Failed to save levels settings due to a server error. Please try again.');
        }
    
        res.redirect(`/dashboard/${guildId}`);
    });

    // Route untuk menampilkan halaman manage achievements
    app.get('/dashboard/:guildId/achievements', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        log('Achievements', `Accessing achievements settings for guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Achievements', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }

        try {
            // Pastikan serverList[guildId] ada
            ensureGuildConfig(guildId);

            // Ambil daftar channel teks dari guild
            const textChannels = guild.channels.cache
                .filter(channel => channel.type === ChannelType.GuildText)
                .map(channel => ({
                    id: channel.id,
                    name: channel.name
                }));

            res.render('achievements', {
                guild,
                achievements: achievementList,
                guildAchievements: serverList[guildId].achievements,
                textChannels, // Kirim daftar channel ke template
                achievementChannel: serverList[guildId].achievementChannel // Kirim channel yang dipilih
            });
        } catch (error) {
            log('Achievements', `Failed to load achievements settings for guild ${guildId}: ${error.message}`, 'error');
            res.status(500).send(`Failed to load achievements settings: ${error.message}`);
        }
    });

    // Route untuk toggle aktif/tidak aktif achievement
    app.post('/dashboard/:guildId/achievements/toggle/:id', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const { id } = req.params;
        log('Achievements', `Toggling achievement ${id} for guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Achievements', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }

        if (!achievementList[id]) {
            log('Achievements', `Achievement ${id} not found`, 'error');
            return res.status(404).send('Achievement not found');
        }

        // Pastikan serverList[guildId] ada
        ensureGuildConfig(guildId);

        // Toggle status enabled
        const currentStatus = serverList[guildId].achievements[id]?.enabled || false;
        serverList[guildId].achievements[id] = { enabled: !currentStatus };

        // Simpan perubahan ke serverList.json
        saveServerList();

        res.redirect(`/dashboard/${guildId}/achievements`);
    });

    // Route untuk mengatur channel pengumuman achievement
    app.post('/dashboard/:guildId/achievements/set-channel', ensureAuthenticated, ensureAdmin, async (req, res) => {
        const guildId = req.params.guildId;
        const { channelId } = req.body;
        log('Achievements', `Setting achievement channel for guild: ${guildId}`);

        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log('Achievements', `Guild ${guildId} not found`, 'error');
            return res.status(404).send('Guild not found');
        }

        // Validasi channelId
        const channel = guild.channels.cache.get(channelId);
        if (!channel || channel.type !== ChannelType.GuildText) {
            log('Achievements', `Invalid channel ${channelId} selected for guild ${guildId}`, 'error');
            return res.status(400).send('Invalid channel selected');
        }

        // Pastikan serverList[guildId] ada
        ensureGuildConfig(guildId);

        // Simpan channelId ke serverList
        serverList[guildId].achievementChannel = channelId;
        saveServerList();

        res.redirect(`/dashboard/${guildId}/achievements`);
    });

    // node web server
    const port = process.env.PORT || 3000;

    app.listen(port, () => {
        log('Dashboard', `Dashboard running on http://localhost:${port}`, 'success');
    });
}

module.exports = { start };