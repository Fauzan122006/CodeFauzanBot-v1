const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { handleLevelUp } = require('../utils/levelUpHandler');
const { handleAchievements } = require('../utils/achievementHandler');
const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { config, serverList, ensureGuildConfig } = require('../utils/dataManager');
const chalk = require('chalk');
const { createCanvas, loadImage } = require('canvas');

// XP Cooldown System (60 seconds)
const xpCooldowns = new Map();
const XP_COOLDOWN_MS = 60 * 1000; // 60 seconds

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
    'reset-achievement': 'reset-achievement',
    'add-role': 'add-role',
    'remove-role': 'remove-role',
    'set-youtube-channel': 'set-youtube-channel',
    'leaderboard': 'leaderboard',
    'balance': 'balance',
    'shop': 'shop',
    'warn': 'warn',
};

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        const userId = message.author.id;
        const guildId = message.guild.id;

        // Pastikan serverList[guildId] ada
        ensureGuildConfig(guildId);

        // Log untuk memastikan event messageCreate dipicu
        log('MessageCreate', `Received message from user ${userId} in guild ${guildId}: "${message.content}"`);

        // Handle prefix commands
        const prefix = config.prefix || '..';
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            if (!commandMapping[commandName]) return;

            const command = client.commands.get(commandMapping[commandName]);
            if (!command) return;

            try {
                const fakeInteraction = {
                    user: message.author,
                    guild: message.guild,
                    guildId: message.guild.id,
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
            return;
        }

        // Inisialisasi data user
        initUser(userId, guildId);

        // Tambah message count
        userData[userId].guilds[guildId].messageCount = (userData[userId].guilds[guildId].messageCount || 0) + 1;
        userData[userId].guilds[guildId].lastActive = Date.now();

        // Log aktivitas
        log('MessageCreate', `Processing message from user ${userId} in guild ${guildId}`);
        log('MessageCreate', `User ${userId} sent a message. Message count: ${userData[userId].guilds[guildId].messageCount}`);

        // XP Cooldown Check
        const cooldownKey = `${userId}-${guildId}`;
        const now = Date.now();
        const lastXPGain = xpCooldowns.get(cooldownKey) || 0;
        const canGainXP = (now - lastXPGain) >= XP_COOLDOWN_MS;

        if (canGainXP) {
            // Tambah coin hanya jika cooldown selesai
            const coinGain = Math.floor(Math.random() * 10) + 5; // 5-15 coin per pesan
            userData[userId].guilds[guildId].coins = (userData[userId].guilds[guildId].coins || 0) + coinGain;
            log('MessageCreate', `User ${userId} gained ${coinGain} coins. Total coins: ${userData[userId].guilds[guildId].coins}`);
            
            // Update cooldown
            xpCooldowns.set(cooldownKey, now);
        } else {
            const timeLeft = Math.ceil((XP_COOLDOWN_MS - (now - lastXPGain)) / 1000);
            log('MessageCreate', `User ${userId} is on XP cooldown (${timeLeft}s remaining)`);
        }

        // Fungsi untuk menghasilkan rank card
        async function generateRankCard(user, guildId, rank, level, xp, maxXP) {
            const rankCardConfig = serverList[guildId]?.rankCard || {
                font: 'Default',
                mainColor: '#FFFFFF',
                backgroundColor: '#000000',
                overlayOpacity: 0.5,
                backgroundImage: ''
            };

            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');

            // Background
            let background;
            try {
                const backgroundUrl = rankCardConfig.backgroundImage || 'https://s6.gifyu.com/images/bbXYO.gif';
                background = await loadImage(backgroundUrl);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.warn(`[RankCard] Failed to load background image: ${error.message}`);
                ctx.fillStyle = rankCardConfig.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Overlay
            ctx.fillStyle = `rgba(0, 0, 0, ${rankCardConfig.overlayOpacity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Avatar
            const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 128 }) || 'https://cdn.discordapp.com/embed/avatars/0.png';
            const avatar = await loadImage(avatarUrl);
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

            // Avatar Border
            ctx.strokeStyle = rankCardConfig.mainColor;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.stroke();

            // Gunakan font yang dipilih
            const fontFamily = rankCardConfig.font === 'Default' ? 'Sans' : rankCardConfig.font;
            log('RankCard', `Using font: ${fontFamily}`);

            // Username
            ctx.font = `bold 36px "${fontFamily}", Sans`;
            ctx.fillStyle = rankCardConfig.mainColor;
            ctx.textAlign = 'left';
            ctx.fillText(user.tag, 200, 60);

            // Rank and Level
            ctx.font = `24px "${fontFamily}", Sans`;
            ctx.fillText(`Rank #${rank}`, 200, 100);
            ctx.fillText(`Level ${level}`, 400, 100);

            // XP Bar
            const barWidth = 300;
            const barHeight = 20;
            const barX = 200;
            const barY = 170;
            const xpProgress = xp / maxXP;
            ctx.fillStyle = rankCardConfig.mainColor;
            ctx.fillRect(barX, barY, xpProgress * barWidth, barHeight);
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            // XP Text
            ctx.font = `16px "${fontFamily}", Sans`;
            ctx.fillText(`${xp}/${maxXP} XP`, 200, barY + 40);

            return canvas.toBuffer('image/png');
        }

        // Logika level-up
        if (!message.author.bot) {
            const guildId = message.guild.id;
            const userId = message.author.id;

            // Pastikan serverList[guildId] ada
            ensureGuildConfig(guildId);

            // Cek apakah fitur levels diaktifkan
            if (!serverList[guildId]?.levels?.enabled) {
                log('MessageCreate', `Levels feature is disabled for guild ${guildId}`, 'info');
                return;
            }

            const levelConfig = serverList[guildId].levels;
            log('MessageCreate', `Level channel configured: ${levelConfig.levelChannel}`, 'info');

            // Cek No-XP Roles
            let member;
            try {
                member = await message.guild.members.fetch(userId);
            } catch (error) {
                log('MessageCreate', `Failed to fetch member ${userId}: ${error.message}`, 'error');
                return;
            }
            const hasNoXPRole = member.roles.cache.some(role => levelConfig.noXPRoles?.includes(role.id));
            if (levelConfig.noXPRolesMode === 'allowAll' && hasNoXPRole) {
                log('MessageCreate', `User ${userId} has a no-XP role in guild ${guildId}`, 'info');
                return;
            }
            if (levelConfig.noXPRolesMode === 'denyAll' && !hasNoXPRole) {
                log('MessageCreate', `User ${userId} does not have an allowed role for XP in guild ${guildId}`, 'info');
                return;
            }

            // Cek No-XP Channels
            const channelId = message.channel.id;
            const isNoXPChannel = levelConfig.noXPChannels?.includes(channelId);
            if (levelConfig.noXPChannelsMode === 'allowAll' && isNoXPChannel) {
                log('MessageCreate', `Channel ${channelId} is a no-XP channel in guild ${guildId}`, 'info');
                return;
            }
            if (levelConfig.noXPChannelsMode === 'denyAll' && !isNoXPChannel) {
                log('MessageCreate', `Channel ${channelId} is not an allowed channel for XP in guild ${guildId}`, 'info');
                return;
            }

            // Berikan XP hanya jika cooldown selesai
            if (!canGainXP) {
                log('MessageCreate', `User ${userId} cannot gain XP due to cooldown`);
                return;
            }

            initUser(userId, guildId); // Pastikan user diinisialisasi
            let user = userData[userId].guilds[guildId];
            if (!user) {
                userData[userId].guilds[guildId] = { xp: 0, level: 1, coins: 0, messageCount: 0 };
                user = userData[userId].guilds[guildId];
            }

            const baseXP = Math.floor(Math.random() * 10) + 15; // XP acak antara 15-25
            const xpGain = baseXP * (levelConfig.xpRate || 1);
            user.xp += xpGain;
            log('MessageCreate', `User ${userId} gained ${xpGain} XP in guild ${guildId}`, 'success');

            // Hitung level
            const xpNeeded = user.level * 100 + 100; // XP yang dibutuhkan untuk naik level
            let leveledUp = false;
            while (user.xp >= xpNeeded) {
                user.xp -= xpNeeded;
                user.level += 1;
                leveledUp = true;
                log('MessageCreate', `User ${userId} leveled up to level ${user.level} in guild ${guildId}`, 'success');
            }

            await saveData(); // Simpan data setelah perubahan

            // Update role berdasarkan level
            if (leveledUp) {
                try {
                    // Cek apakah bot punya izin ManageRoles
                    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                        log('MessageCreate', 'Bot tidak punya izin ManageRoles!', 'error');
                        return;
                    }

                    // Cari role reward yang sesuai dengan level pengguna
                    let newRoleId = null;
                    let highestLevel = 0;
                    for (const reward of levelConfig.roleRewards || []) {
                        if (user.level >= reward.level && reward.level >= highestLevel) {
                            newRoleId = reward.roleId;
                            highestLevel = reward.level;
                        }
                    }

                    if (newRoleId) {
                        const role = message.guild.roles.cache.get(newRoleId);
                        if (!role) {
                            log('MessageCreate', `Role with ID ${newRoleId} not found!`, 'error');
                            return;
                        }

                        // Cek apakah role-nya bisa dikasih
                        if (role.position >= message.guild.members.me.roles.highest.position) {
                            log('MessageCreate', `Role ${role.name} lebih tinggi dari role bot!`, 'error');
                            return;
                        }

                        // Jika roleRewardType adalah 'highest', hapus role lain
                        if (levelConfig.roleRewardType === 'highest') {
                            for (const reward of levelConfig.roleRewards) {
                                if (reward.roleId !== newRoleId) {
                                    const oldRole = message.guild.roles.cache.get(reward.roleId);
                                    if (oldRole && member.roles.cache.has(oldRole.id)) {
                                        await member.roles.remove(oldRole);
                                        log('MessageCreate', `Menghapus role lama ${oldRole.name} dari ${member.user.tag}`, 'success');
                                    }
                                }
                            }
                        }

                        // Tambahkan role baru jika belum dimiliki
                        if (!member.roles.cache.has(role.id)) {
                            await member.roles.add(role);
                            log('MessageCreate', `Menambahkan role ${role.name} ke ${member.user.tag}`, 'success');
                        }
                    }

                    // Hitung rank (berdasarkan XP)
                    const allUsers = Object.entries(userData)
                        .filter(([id, data]) => data.guilds && data.guilds[guildId]) // Pastikan guilds ada
                        .map(([id, data]) => ({
                            id,
                            xp: data.guilds[guildId]?.xp || 0,
                            level: data.guilds[guildId]?.level || 1
                        }))
                        .sort((a, b) => (b.xp + b.level * 1000) - (a.xp + a.level * 1000));
                    const rank = allUsers.findIndex(u => u.id === userId) + 1;

                    // Generate rank card
                    const rankCardBuffer = await generateRankCard(member.user, guildId, rank, user.level, user.xp, xpNeeded);

                    // Kirim pengumuman level-up dengan rank card
                    const levelMessage = levelConfig.levelMessage
                        .replace('[player]', member.user.tag)
                        .replace('[level]', user.level);

                    const levelUpEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🎉 Level Up!')
                        .setDescription(levelMessage)
                        .setImage('attachment://rank-card.png')
                        .setTimestamp();

                    // Logika untuk mengirim ke levelChannel
                    const levelChannelId = levelConfig.levelChannel || message.channel.id;
                    log('MessageCreate', `Attempting to send level-up message to channel ${levelChannelId}`);

                    const levelChannel = message.guild.channels.cache.get(levelChannelId);
                    if (levelChannel) {
                        // Cek apakah bot punya izin untuk mengirim pesan di channel tersebut
                        const botPermissions = levelChannel.permissionsFor(message.guild.members.me);
                        if (!botPermissions.has(PermissionFlagsBits.SendMessages)) {
                            log('MessageCreate', `Bot lacks SEND_MESSAGES permission in channel ${levelChannelId}`, 'error');
                            await message.channel.send({
                                embeds: [levelUpEmbed],
                                files: [{ attachment: rankCardBuffer, name: 'rank-card.png' }]
                            });
                        } else {
                            try {
                                await levelChannel.send({
                                    embeds: [levelUpEmbed],
                                    files: [{ attachment: rankCardBuffer, name: 'rank-card.png' }]
                                });
                                log('MessageCreate', `Successfully sent level-up message to channel ${levelChannelId}`, 'success');
                            } catch (error) {
                                log('MessageCreate', `Failed to send level-up message to channel ${levelChannelId}: ${error.message}`, 'error');
                                await message.channel.send({
                                    embeds: [levelUpEmbed],
                                    files: [{ attachment: rankCardBuffer, name: 'rank-card.png' }]
                                });
                            }
                        }
                    } else {
                        log('MessageCreate', `Level channel ${levelChannelId} not found, falling back to message channel ${message.channel.id}`, 'warning');
                        await message.channel.send({
                            embeds: [levelUpEmbed],
                            files: [{ attachment: rankCardBuffer, name: 'rank-card.png' }]
                        });
                    }
                } catch (error) {
                    log('MessageCreate', `Gagal update role atau kirim rank card untuk ${userId}: ${error.message}`, 'error');
                }
            }
        }

        // Panggil handler untuk achievements (level up sudah dihandle di atas)
        try {
            await handleAchievements(userId, message.guild, 'message');
        } catch (error) {
            log('MessageCreate', `Error handling achievements for user ${userId}: ${error.message}`, 'error');
        }

        // Fitur baru: Deteksi dan balas salam berdasarkan waktu
        const content = message.content.toLowerCase();
        log('MessageCreate', `Checking for greeting in message: "${content}"`);

        const greetings = {
            pagi: ['selamat pagi', 'pagi', 'good morning', 'morning'],
            siang: ['selamat siang', 'siang', 'good afternoon'],
            sore: ['selamat sore', 'sore', 'good evening'],
            malam: ['selamat malam', 'malam', 'good night', 'night']
        };

        const replies = {
            pagi: {
                match: [
                    "Selamat pagi juga, @user! Semoga harimu cerah seperti mentari pagi! 🌞",
                    "Pagi, @user! Yuk, mulai hari dengan semangat baru! 🚀",
                    "Good morning, @user! Apa rencana seru untuk hari ini? 😊",
                    "Selamat pagi, @user! Jangan lupa sarapan ya, biar semangat! 🍳"
                ],
                mismatch: [
                    "Selamat pagi jugaa, @user! Tapi sekarang kayaknya bukan pagi deh wkwk 🌙",
                    "Pagi, @user? Hmm, sepertinya matahari udah lupa sama pagi nih! 😅",
                    "Good morning, @user! Tapi ini udah malam, apa kamu baru bangun? 😂",
                    "Selamat pagi, @user! Eits, ini sih udah waktunya malam, kamu kesiangan banget ya! 🌃"
                ]
            },
            siang: {
                match: [
                    "Selamat siang, @user! Udah makan siang belum? 🍽️",
                    "Siang, @user! Panas-panas gini enaknya ngopi bareng nih! ☕",
                    "Good afternoon, @user! Semoga siangmu produktif ya! 💼",
                    "Selamat siang, @user! Jangan lupa istirahat bentar, ya! 😊"
                ],
                mismatch: [
                    "Selamat siang, @user? Hmm, kayaknya siang udah lewat nih, sekarang udah malam! 🌙",
                    "Siang, @user! Tapi ini udah sore, apa kamu lupa waktu? 😅",
                    "Good afternoon, @user! Eits, ini sih udah malam, kamu telat banget! 😂",
                    "Selamat siang, @user! Tapi sekarang udah waktunya malam, kamu ketinggalan siang nih! 🌃"
                ]
            },
            sore: {
                match: [
                    "Selamat sore, @user! Sore ini enaknya santai sambil lihat sunset, ya! 🌅",
                    "Sore, @user! Udah siap buat malam yang seru belum? 🎉",
                    "Good evening, @user! Sore ini apa kabar? 😊",
                    "Selamat sore, @user! Yuk, nikmati sore dengan teh hangat! 🍵"
                ],
                mismatch: [
                    "Selamat sore, @user? Hmm, sekarang udah malam, sore tadi kamu ke mana aja? 🌙",
                    "Sore, @user! Tapi ini udah pagi lagi, kamu ketinggalan sore kemarin nih! 😅",
                    "Good evening, @user! Eits, ini sih udah pagi, kamu telat banget! 😂",
                    "Selamat sore, @user! Tapi sekarang udah malam, sore tadi kamu sibuk apa? 🌃"
                ]
            },
            malam: {
                match: [
                    "Selamat malam, @user! Malam ini enaknya tidur cepet biar mimpi indah! 🌙",
                    "Malam, @user! Jangan lupa matiin lampu biar hemat listrik ya! 💡",
                    "Good night, @user! Semoga tidurmu nyenyak dan mimpi indah! 😴",
                    "Selamat malam, @user! Yuk, ceritain apa yang seru hari ini! 🌟"
                ],
                mismatch: [
                    "Selamat malam, @user? Hmm, sekarang udah pagi, apa kamu begadang semalaman? 🌞",
                    "Malam, @user! Tapi ini udah siang, kamu ketinggalan malam nih! 😅",
                    "Good night, @user! Eits, ini sih udah pagi, kamu telat tidur ya? 😂",
                    "Selamat malam, @user! Tapi sekarang udah siang, apa kamu baru bangun? 🌞"
                ]
            }
        };

        let detectedGreeting = null;
        for (const [timeOfDay, phrases] of Object.entries(greetings)) {
            for (const phrase of phrases) {
                if (content.includes(phrase)) {
                    detectedGreeting = timeOfDay;
                    log('MessageCreate', `Detected greeting: "${phrase}" (category: ${timeOfDay})`);
                    break;
                }
            }
            if (detectedGreeting) break;
        }

        if (detectedGreeting) {
            const now = new Date();
            const wibOffset = 7 * 60;
            const localTime = new Date(now.getTime() + (wibOffset * 60 * 1000));
            const hours = localTime.getUTCHours();

            log('MessageCreate', `Current time (WIB): ${hours}:${localTime.getUTCMinutes()}`);

            let currentTimeOfDay;
            if (hours >= 0 && hours < 11) {
                currentTimeOfDay = 'pagi';
            } else if (hours >= 11 && hours < 15) {
                currentTimeOfDay = 'siang';
            } else if (hours >= 15 && hours < 18) {
                currentTimeOfDay = 'sore';
            } else {
                currentTimeOfDay = 'malam';
            }

            log('MessageCreate', `Determined time of day: ${currentTimeOfDay}`);

            const replyList = detectedGreeting === currentTimeOfDay ? replies[detectedGreeting].match : replies[detectedGreeting].mismatch;
            const randomReply = replyList[Math.floor(Math.random() * replyList.length)];
            const reply = randomReply.replace('@user', `<@${message.author.id}>`);

            log('MessageCreate', `Sending reply: "${reply}"`);

            try {
                await message.reply(reply);
                log('MessageCreate', `Replied to greeting "${detectedGreeting}" from user ${userId} with: ${reply}`, 'success');
            } catch (error) {
                log('MessageCreate', `Failed to reply to greeting: ${error.message}`, 'error');
            }
        } else {
            log('MessageCreate', `No greeting detected in message: "${content}"`);
        }

        // Simpan data user setelah semua perubahan
        try {
            await saveData();
            log('MessageCreate', `Successfully saved user data for user ${userId}`, 'success');
        } catch (error) {
            log('MessageCreate', `Failed to save user data for user ${userId}: ${error.message}`, 'error');
        }

        // Logika Automod
        const automodConfig = serverList[guildId]?.automod;
        if (!automodConfig || !automodConfig.enabled) {
            log('Automod', `Automod is disabled for guild ${guildId}`);
            return;
        }

        const automodMember = message.member;
        if (!automodMember) {
            log('Automod', `Could not fetch member for user ${userId} in guild ${guildId}`, 'error');
            return;
        }

        // Cek jika member memiliki izin Administrator atau Manage Guild
        if (automodMember.permissions.has(PermissionFlagsBits.Administrator) || automodMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
            log('Automod', `User ${userId} has Administrator or Manage Guild permissions, skipping automod checks`);
            return;
        }

        // Cek apakah bot punya izin untuk memberikan timeout
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
            log('Automod', `Bot lacks MODERATE_MEMBERS permission in guild ${guildId}, skipping automod checks`, 'error');
            return;
        }

        // Cek apakah role bot lebih tinggi dari role pengguna
        if (automodMember.roles.highest.position >= message.guild.members.me.roles.highest.position) {
            log('Automod', `Bot's highest role is not higher than ${automodMember.user.tag}'s highest role in guild ${guildId}, skipping automod checks`, 'error');
            return;
        }

        // Fungsi untuk mengecek whitelist
        const isWhitelisted = (featureConfig) => {
            if (featureConfig.channelWhitelist?.includes(message.channel.id)) {
                log('Automod', `Channel ${message.channel.id} is whitelisted for ${featureConfig.name} in guild ${guildId}`);
                return true;
            }
            if (featureConfig.roleWhitelist?.some(roleId => automodMember.roles.cache.has(roleId))) {
                log('Automod', `User ${userId} has a whitelisted role for ${featureConfig.name} in guild ${guildId}`);
                return true;
            }
            return false;
        };

        // Fungsi untuk menangani punishment berdasarkan punishmentType
        const applyPunishment = async (featureConfig, reason) => {
            const punishmentType = featureConfig.punishmentType || 'timeout';
            const timeoutDuration = featureConfig.timeout?.duration * (featureConfig.timeout?.unit === 'seconds' ? 1000 :
                featureConfig.timeout?.unit === 'minutes' ? 60 * 1000 :
                featureConfig.timeout?.unit === 'hours' ? 60 * 60 * 1000 :
                24 * 60 * 60 * 1000);

            try {
                switch (punishmentType) {
                    case 'timeout':
                        await automodMember.timeout(timeoutDuration, reason);
                        log('Automod', `Timed out ${automodMember.user.tag} in guild ${guildId} for ${featureConfig.name}`, 'success');
                        break;
                    case 'warn':
                        // Logika untuk warn (bisa disesuaikan dengan sistem warn yang kamu miliki)
                        log('Automod', `Warned ${automodMember.user.tag} in guild ${guildId} for ${featureConfig.name}`, 'success');
                        break;
                    case 'kick':
                        await automodMember.kick(reason);
                        log('Automod', `Kicked ${automodMember.user.tag} from guild ${guildId} for ${featureConfig.name}`, 'success');
                        break;
                    case 'ban':
                        await automodMember.ban({ reason });
                        log('Automod', `Banned ${automodMember.user.tag} from guild ${guildId} for ${featureConfig.name}`, 'success');
                        break;
                }

                await message.delete().catch(err => {
                    log('Automod', `Failed to delete message: ${err.message}`, 'error');
                });

                // Hitung waktu berakhirnya timeout (jika punishmentType adalah timeout)
                let timeoutEnd = '';
                if (punishmentType === 'timeout') {
                    const endTime = new Date(Date.now() + timeoutDuration);
                    timeoutEnd = `**Ends At:** ${endTime.toLocaleString('en-US', { timeZone: 'UTC' })} UTC\n`;
                }

                // Buat embed untuk notifikasi DM
                const punishmentEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`⚠️ You Have Been ${punishmentType.charAt(0).toUpperCase() + punishmentType.slice(1)}ed`)
                    .setDescription(
                        `You have been **${punishmentType}ed** in **${message.guild.name}**.\n` +
                        `**Violation:** ${reason}\n` +
                        (punishmentType === 'timeout' ? `**Duration:** ${featureConfig.timeout.duration} ${featureConfig.timeout.unit}\n${timeoutEnd}` : '') +
                        (['kick', 'ban'].includes(punishmentType) ? `You have been removed from the server.` : '')
                    )
                    .setTimestamp();

                // Kirim notifikasi DM ke pengguna
                await message.author.send({ embeds: [punishmentEmbed] }).catch(err => {
                    log('Automod', `Failed to send punishment notification to ${message.author.tag}: ${err.message}`, 'error');
                });
            } catch (error) {
                log('Automod', `Failed to apply ${punishmentType} to ${automodMember.user.tag} in guild ${guildId} for ${featureConfig.name}: ${error.message}`, 'error');
            }
        };

        // Anti Spam
        if (automodConfig.antiSpam?.enabled) {
            automodConfig.antiSpam.name = 'Anti Spam';
            if (isWhitelisted(automodConfig.antiSpam)) return;

            if (!client.messageTimestamps) client.messageTimestamps = new Map();
            const userTimestamps = client.messageTimestamps.get(message.author.id) || [];
            userTimestamps.push(Date.now());
            client.messageTimestamps.set(message.author.id, userTimestamps);

            const cutoff = Date.now() - (automodConfig.antiSpam.seconds * 1000);
            while (userTimestamps.length && userTimestamps[0] < cutoff) userTimestamps.shift();

            if (userTimestamps.length >= automodConfig.antiSpam.messages) {
                await applyPunishment(automodConfig.antiSpam, `Anti Spam: Sending too many messages (${userTimestamps.length} messages in ${automodConfig.antiSpam.seconds} seconds)`);
                return;
            }
        }

        // Anti Invite
        if (automodConfig.antiInvite?.enabled) {
            automodConfig.antiInvite.name = 'Anti Invite';
            if (isWhitelisted(automodConfig.antiInvite)) return;

            if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
                await applyPunishment(automodConfig.antiInvite, 'Anti Invite: Sending a Discord invite link');
                return;
            }
        }

        // Anti Links
        if (automodConfig.antiLinks?.enabled) {
            automodConfig.antiLinks.name = 'Anti Links';
            if (isWhitelisted(automodConfig.antiLinks)) return;

            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = message.content.match(urlRegex) || [];

            if (urls.length > 0) {
                const linksWhitelist = automodConfig.antiLinks.linksWhitelist || [];
                let isWhitelistedLink = false;

                for (const url of urls) {
                    isWhitelistedLink = linksWhitelist.some(pattern => {
                        // Ganti * dengan regex wildcard (.*)
                        const regexPattern = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
                        const regex = new RegExp(`^${regexPattern}$`, 'i');
                        return regex.test(url);
                    });

                    if (isWhitelistedLink) {
                        log('Automod', `Link ${url} is whitelisted for Anti Links in guild ${guildId}`);
                        break;
                    }
                }

                if (!isWhitelistedLink) {
                    await applyPunishment(automodConfig.antiLinks, `Anti Links: Sending unwhitelisted links (${urls.join(', ')})`);
                    return;
                }
            }
        }

        // Mentions Spam
        if (automodConfig.mentionsSpam?.enabled) {
            automodConfig.mentionsSpam.name = 'Mentions Spam';
            if (isWhitelisted(automodConfig.mentionsSpam)) return;

            const mentionCount = (message.mentions.users.size + message.mentions.roles.size);
            if (mentionCount > automodConfig.mentionsSpam.maxMentions) {
                await applyPunishment(automodConfig.mentionsSpam, `Mentions Spam: Too many mentions (${mentionCount} mentions, max allowed: ${automodConfig.mentionsSpam.maxMentions})`);
                return;
            }
        }

        // Caps Spam
        if (automodConfig.capsSpam?.enabled) {
            automodConfig.capsSpam.name = 'Caps Spam';
            if (isWhitelisted(automodConfig.capsSpam)) return;

            const capsPercentage = (message.content.replace(/[^A-Z]/g, '').length / message.content.length) * 100;
            if (capsPercentage > 80 && message.content.length > 10) {
                await applyPunishment(automodConfig.capsSpam, `Caps Spam: Using too many capital letters (${capsPercentage.toFixed(2)}% caps, max allowed: 80%)`);
                return;
            }
        }
    },
};