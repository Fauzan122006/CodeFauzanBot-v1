const { EmbedBuilder } = require('discord.js');
const { handleLevelUp } = require('../utils/levelUpHandler');
const { handleAchievements } = require('../utils/achievementHandler');
const { userData, initUser, saveData } = require('../utils/userDataHandler');
const { config, serverList, ensureGuildConfig } = require('../utils/dataManager');
const chalk = require('chalk');

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
        const prefix = config.prefix || '..'; // Tetap gunakan config untuk prefix
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

        // Tambah message count, XP, dan coin
        userData[userId].guilds[guildId].messageCount = (userData[userId].guilds[guildId].messageCount || 0) + 1;
        const xpGain = Math.floor(Math.random() * 50) + 50; // 50-100 XP per pesan
        const coinGain = Math.floor(Math.random() * 10) + 5; // 5-15 coin per pesan
        userData[userId].guilds[guildId].xp = (userData[userId].guilds[guildId].xp || 0) + xpGain;
        userData[userId].guilds[guildId].coins = (userData[userId].guilds[guildId].coins || 0) + coinGain;
        userData[userId].guilds[guildId].lastActive = Date.now();

        // Log aktivitas
        log('MessageCreate', `Processing message from user ${userId} in guild ${guildId}`);
        log('MessageCreate', `User ${userId} sent a message. Message count: ${userData[userId].guilds[guildId].messageCount}`);
        log('MessageCreate', `User ${userId} gained ${xpGain} XP. Total XP: ${userData[userId].guilds[guildId].xp}`);
        log('MessageCreate', `User ${userId} gained ${coinGain} coins. Total coins: ${userData[userId].guilds[guildId].coins}`);

        // Hitung level berdasarkan XP (contoh: 100 XP per level)
        const user = userData[userId].guilds[guildId];
        let leveledUp = false;
        let previousLevel = user.level || 1;

        while (user.xp >= previousLevel * 100) {
            user.xp -= previousLevel * 100;
            user.level = (user.level || 1) + 1;
            leveledUp = true;
            previousLevel = user.level;
        }

        // Update role berdasarkan level
        if (leveledUp) {
            try {
                const member = await message.guild.members.fetch(userId);

                // Definisikan role berdasarkan level
                let newRoleName;
                if (user.level >= 1 && user.level <= 10) {
                    newRoleName = 'Lounge Visitor';
                } else if (user.level >= 11 && user.level <= 20) {
                    newRoleName = 'Cozy Settler';
                } else if (user.level >= 21 && user.level <= 30) {
                    newRoleName = 'Comfort Zone';
                } else if (user.level >= 31 && user.level <= 40) {
                    newRoleName = 'Night Dweller';
                } else if (user.level >= 41) {
                    newRoleName = 'Paradise Resident';
                }

                // Cek apakah bot punya izin ManageRoles
                if (!message.guild.members.me.permissions.has('ManageRoles')) {
                    log('MessageCreate', 'Bot tidak punya izin ManageRoles!', 'error');
                    return;
                }

                // Cari role di server berdasarkan nama
                let role = message.guild.roles.cache.find(r => r.name === newRoleName);
                if (!role) {
                    // Kalau role ga ada, bikin role baru
                    try {
                        role = await message.guild.roles.create({
                            name: newRoleName,
                            color: 'Default', // Bisa diganti dengan warna tertentu
                            reason: `Role dibuat otomatis untuk level ${user.level}`
                        });
                        log('MessageCreate', `Berhasil membuat role baru: ${newRoleName} (${role.id})`, 'success');
                    } catch (error) {
                        log('MessageCreate', `Gagal membuat role ${newRoleName}: ${error.message}`, 'error');
                        return;
                    }
                }

                // Cek apakah role-nya bisa dikasih (harus lebih rendah dari role bot)
                if (role.position >= message.guild.members.me.roles.highest.position) {
                    log('MessageCreate', `Role ${newRoleName} lebih tinggi dari role bot!`, 'error');
                    return;
                }

                // Daftar semua role level
                const levelRoles = [
                    'Lounge Visitor',
                    'Cozy Settler',
                    'Comfort Zone',
                    'Night Dweller',
                    'Paradise Resident'
                ];

                // Hapus role level lama (kalau ada)
                for (const roleName of levelRoles) {
                    if (roleName !== newRoleName) {
                        const oldRole = message.guild.roles.cache.find(r => r.name === roleName);
                        if (oldRole && member.roles.cache.has(oldRole.id)) {
                            await member.roles.remove(oldRole);
                            log('MessageCreate', `Menghapus role lama ${oldRole.name} dari ${member.user.tag}`, 'success');
                        }
                    }
                }

                // Tambah role baru
                if (!member.roles.cache.has(role.id)) {
                    await member.roles.add(role);
                    log('MessageCreate', `Menambahkan role ${role.name} ke ${member.user.tag}`, 'success');
                }

                // Kirim pesan level up
                const levelUpEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 Level Up!')
                    .setDescription(`${member.user.tag} telah naik ke **Level ${user.level}**!\nKamu sekarang adalah **${newRoleName}**!`)
                    .setTimestamp();

                // Kirim ke channel level-up (kalau ada) atau channel saat ini
                const levelChannelId = serverList[guildId].levelChannel || message.channel.id; // Gunakan serverList
                const levelChannel = message.guild.channels.cache.get(levelChannelId);
                if (levelChannel) {
                    await levelChannel.send({ embeds: [levelUpEmbed] });
                } else {
                    await message.channel.send({ embeds: [levelUpEmbed] });
                }
            } catch (error) {
                log('MessageCreate', `Gagal update role untuk ${userId}: ${error.message}`, 'error');
            }
        }

        // Panggil handler untuk level up dan achievements
        try {
            await handleLevelUp(userId, message.guild, message.author);
            await handleAchievements(userId, message.guild, 'message');
            await handleAchievements(userId, message.guild, 'level');
        } catch (error) {
            log('MessageCreate', `Error handling level up or achievements for user ${userId}: ${error.message}`, 'error');
        }

        // Fitur baru: Deteksi dan balas salam berdasarkan waktu
        const content = message.content.toLowerCase();

        // Log untuk memastikan bot memproses salam
        log('MessageCreate', `Checking for greeting in message: "${content}"`);

        // Daftar salam yang akan dideteksi
        const greetings = {
            pagi: ['selamat pagi', 'pagi', 'good morning', 'morning'],
            siang: ['selamat siang', 'siang', 'good afternoon'],
            sore: ['selamat sore', 'sore', 'good evening'],
            malam: ['selamat malam', 'malam', 'good night', 'night']
        };

        // Daftar balasan random
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

        // Deteksi salam dalam pesan
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
            // Dapatkan waktu saat ini (WIB, UTC+7)
            const now = new Date();
            const wibOffset = 7 * 60; // WIB adalah UTC+7 (dalam menit)
            const localTime = new Date(now.getTime() + (wibOffset * 60 * 1000));
            const hours = localTime.getUTCHours();

            // Log waktu saat ini
            log('MessageCreate', `Current time (WIB): ${hours}:${localTime.getUTCMinutes()}`);

            // Tentukan waktu saat ini
            let currentTimeOfDay;
            if (hours >= 0 && hours < 11) {
                currentTimeOfDay = 'pagi'; // 00:00 - 10:59 WIB
            } else if (hours >= 11 && hours < 15) {
                currentTimeOfDay = 'siang'; // 11:00 - 14:59 WIB
            } else if (hours >= 15 && hours < 18) {
                currentTimeOfDay = 'sore'; // 15:00 - 17:59 WIB
            } else {
                currentTimeOfDay = 'malam'; // 18:00 - 23:59 WIB
            }

            // Log waktu yang ditentukan
            log('MessageCreate', `Determined time of day: ${currentTimeOfDay}`);

            // Pilih balasan berdasarkan apakah waktu sesuai atau tidak
            const replyList = detectedGreeting === currentTimeOfDay ? replies[detectedGreeting].match : replies[detectedGreeting].mismatch;
            const randomReply = replyList[Math.floor(Math.random() * replyList.length)];

            // Ganti @user dengan mention user
            const reply = randomReply.replace('@user', `<@${message.author.id}>`);

            // Log balasan yang akan dikirim
            log('MessageCreate', `Sending reply: "${reply}"`);

            // Kirim balasan
            try {
                await message.reply(reply);
                log('MessageCreate', `Replied to greeting "${detectedGreeting}" from user ${userId} with: ${reply}`, 'success');
            } catch (error) {
                log('MessageCreate', `Failed to reply to greeting: ${error.message}`, 'error');
            }
        } else {
            log('MessageCreate', `No greeting detected in message: "${content}"`);
        }
    },
};