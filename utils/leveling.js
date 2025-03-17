const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { config } = require('./saveData');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Path ke file database userData.json
const dbPath = path.join(__dirname, '../database/userData.json');

// Fungsi untuk load database
function loadDatabase() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(dbPath));
}

// Fungsi untuk save database
function saveDatabase(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Fungsi untuk hitung rank user
async function getUserRank(guild, userId) {
    const db = loadDatabase();
    const guildData = db[guild.id] || {};

    // Ambil semua user di guild dan sort berdasarkan XP
    const users = Object.entries(guildData)
        .map(([id, data]) => ({ id, xp: data.xp || 0 }))
        .sort((a, b) => b.xp - a.xp);

    // Cari rank user
    const rank = users.findIndex(user => user.id === userId) + 1;
    return rank || 1; // Default rank 1 kalau tidak ada data
}

// Fungsi untuk tambah XP dan cek level up
async function addXPAndCheckLevelUp(client, message) {
    if (!message.guild || message.author.bot) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    // Load database
    let db = loadDatabase();
    if (!db[guildId]) db[guildId] = {};
    if (!db[guildId][userId]) db[guildId][userId] = { xp: 0, level: 0 };

    const userData = db[guildId][userId];
    userData.xp = (userData.xp || 0) + Math.floor(Math.random() * 10) + 15; // Tambah XP acak (15-25)

    // Hitung level berdasarkan XP
    const newLevel = Math.floor(userData.xp / 100); // 100 XP = 1 level
    const levelChanged = newLevel > userData.level;

    if (levelChanged) {
        userData.level = newLevel;

        // Kirim level up message
        const serverConfig = config[guildId] || {};
        const levelChannelId = serverConfig.levelChannel || config.defaultChannels.levelChannel || message.guild.channels.cache.find(ch => ch.name === 'levels')?.id;
        const levelChannel = message.guild.channels.cache.get(levelChannelId);

        if (levelChannel) {
            // Hitung rank user
            const rank = await getUserRank(message.guild, userId);

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
            const avatarUrl = message.author.displayAvatarURL({ extension: 'png', size: 128 });
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
            ctx.fillText(`Level Up! ${message.author.username}`, 200, canvas.height / 2 - 40);

            // Tambah teks level
            ctx.font = '24px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`Level ${newLevel}`, 200, canvas.height / 2);

            // Tambah teks rank
            ctx.fillText(`Rank #${rank}`, 200, canvas.height / 2 + 40);

            // Tambah progress bar XP
            const maxXPForLevel = newLevel * 100 + 100; // XP maksimum untuk level berikutnya
            const xpProgress = (userData.xp % 100) / 100; // Persentase XP untuk level saat ini
            ctx.fillStyle = '#00BFFF';
            ctx.fillRect(200, canvas.height / 2 + 70, xpProgress * 300, 20); // Progress bar (300px panjang)
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(200, canvas.height / 2 + 70, 300, 20);

            // Convert canvas ke buffer
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'level-up-image.png' });

            // Kirim gambar
            await levelChannel.send({ files: [attachment] });
        }
    }

    // Simpan perubahan ke database
    db[guildId][userId] = userData;
    saveDatabase(db);
}

module.exports = { addXPAndCheckLevelUp };