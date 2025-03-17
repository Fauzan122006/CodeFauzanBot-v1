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

        // Update active time
        if (!userData[userId].lastActive) userData[userId].lastActive = Date.now();
        const timeSinceLastActive = Math.floor((Date.now() - userData[userId].lastActive) / 1000);

        if (timeSinceLastActive > 86400) {
            userData[userId].activeTime = 0;
        } else {
            userData[userId].activeTime = (userData[userId].activeTime || 0) + timeSinceLastActive;
        }
        userData[userId].lastActive = Date.now();

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

                // Buat gambar level up dengan ukuran lebih kecil
                const canvas = createCanvas(500, 180); // Ukuran baru
                const ctx = canvas.getContext('2d');

                // Load background dari config.json
                const backgroundUrl = config.levelUpImage || 'https://s6.gifyu.com/images/bbXYO.gif';
                const background = await loadImage(backgroundUrl);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

                // Tambah efek gelap
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Load profile picture user
                const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 96 }); // Kecilin avatar
                const avatar = await loadImage(avatarUrl);

                // Gambar profile picture dalam lingkaran
                const avatarSize = 96; // Kecilin avatar
                const avatarX = 40;
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
                ctx.lineWidth = 3; // Kecilin border
                ctx.beginPath();
                ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.stroke();

                // Tambah teks level up
                ctx.font = 'bold 28px Sans'; // Kecilin font
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'left';
                ctx.fillText(`Level Up! ${user.username}`, 150, canvas.height / 2 - 30);

                // Tambah teks level dan rank
                ctx.font = '18px Sans'; // Kecilin font
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`Level ${userData[userId].level}`, 150, canvas.height / 2 + 10);
                ctx.fillText(`Rank #${rank}`, 150, canvas.height / 2 + 40);

                // Tambah progress bar XP
                const barWidth = 200; // Kecilin progress bar
                const barHeight = 15; // Kecilin tinggi bar
                const barX = 150;
                const barY = canvas.height / 2 + 60;
                const xpProgress = currentXP / nextLevelXP;
                ctx.fillStyle = '#00BFFF';
                ctx.fillRect(barX, barY, xpProgress * barWidth, barHeight);
                ctx.strokeStyle = '#FFFFFF';
                ctx.strokeRect(barX, barY, barWidth, barHeight);

                // Teks XP di kanan bar, warna putih, ukuran kecil
                ctx.font = '10px Sans'; // Kecilin font
                ctx.fillStyle = '#FFFFFF';
                ctx.textAlign = 'right';
                ctx.fillText(`${currentXP}/${nextLevelXP} XP`, barX + barWidth + 10, barY + 12); // Sesuaikan posisi

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
                        case 'all-nighter':
                            if (userData[userId].activeTime >= 86400) unlocked = true;
                            break;
                        case 'voice-legend':
                            if (userData[userId].voiceTime >= 36000) unlocked = true;
                            break;
                    }

                    if (unlocked) {
                        userData[userId].achievements.push(key);
                        userData[userId].xp += achievement.xpReward;

                        // Buat gambar achievement dengan ukuran lebih kecil
                        const canvas = createCanvas(450, 120); // Ukuran baru
                        const ctx = canvas.getContext('2d');

                        // Background polos
                        ctx.fillStyle = '#2C2F33';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Load ikon achievement
                        const iconUrl = achievement.icon || 'https://i.imgur.com/default-icon.png';
                        let icon;
                        try {
                            icon = await loadImage(iconUrl);
                        } catch (error) {
                            console.error(`Gagal memuat ikon untuk achievement ${key}: ${error.message}`);
                            icon = await loadImage('https://i.imgur.com/default-icon.png');
                        }

                        // Gambar ikon achievement di kiri
                        const iconSize = 48; // Kecilin ikon
                        const iconX = 15;
                        const iconY = (canvas.height - iconSize) / 2;
                        ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);

                        // Teks "ACHIEVEMENT UNLOCKED!"
                        ctx.textAlign = 'left';
                        ctx.font = 'bold 16px Sans'; // Kecilin font
                        ctx.fillStyle = '#FFD700';
                        ctx.fillText('ACHIEVEMENT UNLOCKED!', iconX + iconSize + 15, 40);

                        // Teks nama achievement
                        ctx.font = 'bold 18px Sans'; // Kecilin font
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillText(achievement.name, iconX + iconSize + 15, 70);

                        // Teks deskripsi achievement
                        ctx.font = '12px Sans'; // Kecilin font
                        ctx.fillStyle = '#B0B0B0';
                        ctx.fillText(achievement.description, iconX + iconSize + 15, 90);

                        // Teks XP reward
                        ctx.font = '12px Sans'; // Kecilin font
                        ctx.fillStyle = '#00FF00';
                        ctx.fillText(`+${achievement.xpReward} XP`, iconX + iconSize + 15, 110);

                        // Convert canvas ke buffer
                        const buffer = canvas.toBuffer('image/png');
                        const attachment = new AttachmentBuilder(buffer, { name: 'achievement-image.png' });

                        // Kirim pesan dengan mention user, lalu lampirkan gambar
                        await achievementChannel.send({
                            content: `Hey ${message.author.toString()}, ACHIEVEMENT UNLOCKED!`,
                            files: [attachment]
                        });
                    }
                }
            }
        }

        saveData();
    },
};