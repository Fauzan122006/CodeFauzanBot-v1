const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { config } = require('../utils/saveData');
const { initUser, getRequiredXP, getRank, userData, saveData } = require('../utils/functions');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        const userId = message.author.id;
        const guildId = message.guild.id;
        initUser(userId);

        // Tambah message count
        userData[userId].messageCount = (userData[userId].messageCount || 0) + 1;

        // Tambah XP (random 50-150 XP per pesan)
        const xpGain = Math.floor(Math.random() * 101) + 50;
        userData[userId].xp += xpGain;

        // Cek apakah user naik level
        const requiredXP = getRequiredXP(userData[userId].level);
        if (userData[userId].xp >= requiredXP) {
            userData[userId].level += 1;
            userData[userId].xp -= requiredXP;

            // Ambil channel level dari config
            const levelChannelId = config[guildId]?.levelChannel || config.defaultChannels.levelChannel || message.guild.channels.cache.find(ch => ch.name === 'levels')?.id;
            const levelChannel = message.guild.channels.cache.get(levelChannelId);

            if (levelChannel) {
                const user = message.author;
                const currentXP = userData[userId].xp;
                const nextLevelXP = getRequiredXP(userData[userId].level);
                const rank = getRank(userData[userId].level);

                // Buat gambar level up
                const canvas = createCanvas(700, 250);
                const ctx = canvas.getContext('2d');

                // Load background dari config.json
                const backgroundUrl = config.levelUpImage || 'https://s6.gifyu.com/images/bbXYO.gif';
                const background = await loadImage(backgroundUrl);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

                // Tambah efek gelap
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Load profile picture user
                const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 128 });
                const avatar = await loadImage(avatarUrl);

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

                // Tambah teks level up
                ctx.font = 'bold 36px Sans';
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'left';
                ctx.fillText(`Level Up! ${user.username}`, 200, canvas.height / 2 - 40);

                // Tambah teks level dan rank
                ctx.font = '24px Sans';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`Level ${userData[userId].level}`, 200, canvas.height / 2);
                ctx.fillText(`Rank #${rank}`, 200, canvas.height / 2 + 40);

                // Tambah progress bar XP
                const xpProgress = currentXP / nextLevelXP;
                ctx.fillStyle = '#00BFFF';
                ctx.fillRect(200, canvas.height / 2 + 70, xpProgress * 300, 20);
                ctx.strokeStyle = '#FFFFFF';
                ctx.strokeRect(200, canvas.height / 2 + 70, 300, 20);
                ctx.fillText(`${currentXP}/${nextLevelXP} XP`, 200, canvas.height / 2 + 100);

                // Convert canvas ke buffer
                const buffer = canvas.toBuffer('image/png');
                const attachment = new AttachmentBuilder(buffer, { name: 'level-up-image.png' });

                // Kirim gambar
                await levelChannel.send({ files: [attachment] });
            }
        }

        // Cek achievement
        if (!userData[userId].achievements) userData[userId].achievements = [];
        const achievements = config.achievements || {};
        const achievementChannelId = config[guildId]?.achievementChannel || config.defaultChannels.achievementChannel || message.guild.channels.cache.find(ch => ch.name === 'achievements')?.id;
        const achievementChannel = message.guild.channels.cache.get(achievementChannelId);

        if (achievementChannel) {
            for (const [key, achievement] of Object.entries(achievements)) {
                if (!userData[userId].achievements.includes(key)) {
                    let unlocked = false;

                    switch (key) {
                        case 'pro-typer':
                            if (userData[userId].messageCount >= 1000) unlocked = true;
                            break;
                        case 'chat-master':
                            if (userData[userId].messageCount >= 5000) unlocked = true;
                            break;
                        case 'first-step':
                            if (userData[userId].messageCount === 1) unlocked = true;
                            break;
                        // Tambah logika untuk achievement lain (misalnya, voice time, active time)
                    }

                    if (unlocked) {
                        userData[userId].achievements.push(key);
                        userData[userId].xp += achievement.xpReward;

                        // Buat gambar achievement
                        const canvas = createCanvas(600, 150); // Ukuran lebih kecil sesuai screenshot
                        const ctx = canvas.getContext('2d');

                        // Background polos (hitam seperti screenshot)
                        ctx.fillStyle = '#2C2F33'; // Warna background Discord dark theme
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Load ikon achievement
                        const iconUrl = achievement.icon || 'https://i.imgur.com/default-icon.png';
                        let icon;
                        try {
                            icon = await loadImage(iconUrl);
                        } catch (error) {
                            console.error(`Gagal memuat ikon untuk achievement ${key}: ${error.message}`);
                            icon = await loadImage('https://i.imgur.com/default-icon.png'); // Fallback ikon
                        }

                        // Gambar ikon achievement di kiri
                        const iconSize = 64;
                        const iconX = 20;
                        const iconY = (canvas.height - iconSize) / 2;
                        ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);

                        // Tambah teks
                        ctx.textAlign = 'left';

                        // Teks "ACHIEVEMENT UNLOCKED!"
                        ctx.font = 'bold 20px Sans';
                        ctx.fillStyle = '#FFD700'; // Warna kuning seperti screenshot
                        ctx.fillText('ACHIEVEMENT UNLOCKED!', iconX + iconSize + 20, 50);

                        // Teks nama achievement
                        ctx.font = 'bold 24px Sans';
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillText(achievement.name, iconX + iconSize + 20, 90);

                        // Teks deskripsi achievement
                        ctx.font = '16px Sans';
                        ctx.fillStyle = '#B0B0B0'; // Abu-abu seperti screenshot
                        ctx.fillText(achievement.description, iconX + iconSize + 20, 115);

                        // Teks XP reward
                        ctx.font = '16px Sans';
                        ctx.fillStyle = '#00FF00'; // Hijau untuk XP
                        ctx.fillText(`+${achievement.xpReward} XP`, iconX + iconSize + 20, 140);

                        // Convert canvas ke buffer
                        const buffer = canvas.toBuffer('image/png');
                        const attachment = new AttachmentBuilder(buffer, { name: 'achievement-image.png' });

                        // Kirim gambar
                        await achievementChannel.send({ files: [attachment] });
                    }
                }
            }
        }

        saveData();
    },
};