const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { config } = require('../utils/saveData');
const { userData, getRequiredXP, getRank } = require('../utils/functions');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your current level, rank, and XP.'),
    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Inisialisasi user data kalau belum ada
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

        const user = interaction.user;
        const currentXP = userData[userId].xp;
        const currentLevel = userData[userId].level;
        const nextLevelXP = getRequiredXP(currentLevel);
        const rank = getRank(userData[userId].level);

        // Buat gambar rank
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

        // Tambah teks rank
        ctx.font = 'bold 36px Sans';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(`${user.username}'s Rank`, 200, canvas.height / 2 - 40);

        // Tambah teks level dan rank
        ctx.font = '24px Sans';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Level ${currentLevel}`, 200, canvas.height / 2);
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
        const attachment = new AttachmentBuilder(buffer, { name: 'rank-image.png' });

        // Kirim gambar
        await interaction.editReply({ files: [attachment] });
    },
};