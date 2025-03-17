const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { config } = require('../utils/saveData');
const { userData, saveData } = require('../utils/functions');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            console.log(`[GuildMemberAdd] User ${member.user.tag} joined guild ${member.guild.id}`);

            const guildId = member.guild.id;
            const userId = member.user.id;
            const serverConfig = config[guildId] || {};
            const welcomeChannelId = serverConfig.welcomeChannel || config.defaultChannels.welcomeChannel || member.guild.channels.cache.find(ch => ch.name === 'welcome')?.id;
            const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

            if (!welcomeChannel) {
                console.log(`[GuildMemberAdd] Welcome channel not found for guild ${guildId}. Expected ID: ${welcomeChannelId}`);
                return;
            }

            console.log(`[GuildMemberAdd] Found welcome channel: ${welcomeChannel.name} (${welcomeChannelId})`);

            // Cek izin bot di channel
            const botMember = member.guild.members.me;
            if (!welcomeChannel.permissionsFor(botMember).has(['SendMessages', 'ViewChannel'])) {
                console.log(`[GuildMemberAdd] Bot does not have permission to send messages or view channel ${welcomeChannel.name} (${welcomeChannelId})`);
                return;
            }

            // Inisialisasi user data
            if (!userData[userId]) {
                userData[userId] = {
                    xp: 0,
                    level: 0,
                    messageCount: 0,
                    achievements: [],
                    activeTime: 0,
                    voiceTime: 0,
                    lastActive: Date.now()
                };
            }

            // Buat canvas untuk gambar welcome
            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');

            // Load background gambar
            const backgroundUrl = config.welcomeImage || 'https://s6.gifyu.com/images/bbXYO.gif';
            console.log(`[GuildMemberAdd] Loading welcome image from URL: ${backgroundUrl}`);
            let background;
            try {
                background = await loadImage(backgroundUrl);
            } catch (error) {
                console.error(`[GuildMemberAdd] Failed to load welcome image: ${error.message}`);
                background = await loadImage('https://via.placeholder.com/700x250'); // Fallback image
            }
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // Tambah efek gelap
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Load profile picture user
            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
            console.log(`[GuildMemberAdd] Loading avatar from URL: ${avatarUrl}`);
            let avatar;
            try {
                avatar = await loadImage(avatarUrl);
            } catch (error) {
                console.error(`[GuildMemberAdd] Failed to load avatar: ${error.message}`);
                avatar = await loadImage('https://via.placeholder.com/128'); // Fallback avatar
            }

            // Gambar profile picture dalam lingkaran
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
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.stroke();

            // Tambah teks selamat datang
            ctx.font = 'bold 36px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(`Welcome ${member.user.username}!`, 200, canvas.height / 2 - 20);

            // Tambah teks member count
            ctx.font = '24px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`Member #${member.guild.memberCount}`, 200, canvas.height / 2 + 20);

            // Convert canvas ke buffer
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });

            // Kirim pesan dengan mention user dan server, lalu lampirkan gambar
            console.log(`[GuildMemberAdd] Sending welcome message to channel ${welcomeChannel.name}`);
            await welcomeChannel.send({
                content: `Hey ${member.toString()}, selamat datang di **${member.guild.name}**!`,
                files: [attachment]
            });

            // Cek achievement "First Step"
            if (!userData[userId].achievements) userData[userId].achievements = [];
            const achievements = config.achievements || {};
            const achievementChannelId = config[guildId]?.achievementChannel || config.defaultChannels.achievementChannel || member.guild.channels.cache.find(ch => ch.name === 'achievements')?.id;
            const achievementChannel = member.guild.channels.cache.get(achievementChannelId);

            if (achievementChannel) {
                console.log(`[GuildMemberAdd] Found achievement channel: ${achievementChannel.name} (${achievementChannelId})`);
                const achievement = achievements['first-step'];
                if (achievement && !userData[userId].achievements.includes('first-step')) {
                    userData[userId].achievements.push('first-step');
                    userData[userId].xp += achievement.xpReward;

                    // Buat gambar achievement
                    const canvas = createCanvas(600, 150);
                    const ctx = canvas.getContext('2d');

                    // Background polos
                    ctx.fillStyle = '#2C2F33';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Load ikon achievement
                    const iconUrl = achievement.icon || 'https://i.imgur.com/default-icon.png';
                    console.log(`[GuildMemberAdd] Loading achievement icon from URL: ${iconUrl}`);
                    let icon;
                    try {
                        icon = await loadImage(iconUrl);
                    } catch (error) {
                        console.error(`[GuildMemberAdd] Failed to load achievement icon: ${error.message}`);
                        icon = await loadImage('https://i.imgur.com/default-icon.png');
                    }

                    // Gambar ikon achievement di kiri
                    const iconSize = 64;
                    const iconX = 20;
                    const iconY = (canvas.height - iconSize) / 2;
                    ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);

                    // Teks "ACHIEVEMENT UNLOCKED!" tanpa nama user di canvas
                    ctx.textAlign = 'left';
                    ctx.font = 'bold 20px Sans';
                    ctx.fillStyle = '#FFD700';
                    ctx.fillText('ACHIEVEMENT UNLOCKED!', iconX + iconSize + 20, 50);

                    // Teks nama achievement
                    ctx.font = 'bold 24px Sans';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(achievement.name, iconX + iconSize + 20, 90);

                    // Teks deskripsi achievement
                    ctx.font = '16px Sans';
                    ctx.fillStyle = '#B0B0B0';
                    ctx.fillText(achievement.description, iconX + iconSize + 20, 115);

                    // Convert canvas ke buffer
                    const buffer = canvas.toBuffer('image/png');
                    const attachment = new AttachmentBuilder(buffer, { name: 'achievement-image.png' });

                    // Kirim pesan dengan mention user, lalu lampirkan gambar
                    console.log(`[GuildMemberAdd] Sending achievement message to channel ${achievementChannel.name}`);
                    await achievementChannel.send({
                        content: `Hey ${member.toString()}, ACHIEVEMENT UNLOCKED!`,
                        files: [attachment]
                    });
                }
            } else {
                console.log(`[GuildMemberAdd] Achievement channel not found for guild ${guildId}. Expected ID: ${achievementChannelId}`);
            }

            saveData();
        } catch (error) {
            console.error('[GuildMemberAdd] Error in guildMemberAdd event:', error);
        }
    },
};