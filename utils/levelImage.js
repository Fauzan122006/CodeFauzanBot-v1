const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { config } = require('./dataManager');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createLevelUpImage(user, level, xp, rank) {
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
    ctx.fillText(`${user.username}'s Rank`, 200, canvas.height / 2 - 40);

    // Tambah teks level
    ctx.font = '24px Sans';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Level ${level}`, 200, canvas.height / 2);

    // Tambah teks rank
    ctx.fillText(`Rank #${rank}`, 200, canvas.height / 2 + 40);

    // Tambah progress bar XP
    const maxXPForLevel = level * 100 + 1000; // Sesuaikan dengan getRequiredXP
    const xpProgress = xp / maxXPForLevel; // Persentase XP untuk level saat ini
    ctx.fillStyle = '#00BFFF';
    ctx.fillRect(200, canvas.height / 2 + 70, xpProgress * 300, 20); // Progress bar (300px panjang)
    ctx.strokeStyle = '#FFFFFF';
    ctx.strokeRect(200, canvas.height / 2 + 70, 300, 20);

    // Tambah teks XP di bawah progress bar
    ctx.font = '16px Sans';
    ctx.fillText(`${xp}/${maxXPForLevel} XP`, 200, canvas.height / 2 + 110);

    // Convert canvas ke buffer
    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'level-up-image.png' });

    return attachment;
}

module.exports = { createLevelUpImage };