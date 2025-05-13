const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { userData, initUser } = require('../utils/userDataHandler');
const { getRequiredXP } = require('../utils/leveluphandler');
const { getRank } = require('../utils/rankhandler');
const { serverList, config } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your rank or someone else\'s rank.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the rank for.')
                .setRequired(false)),
    async execute(interaction) {
        try {
            await interaction.deferReply();

            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userId = targetUser.id; // Pastikan userId didefinisikan di sini
            const guildId = interaction.guild.id;

            // Inisialisasi user jika belum ada
            initUser(userId, guildId);

            // Ambil data user
            const userGuildData = userData[userId]?.guilds?.[guildId];
            if (!userGuildData) {
                throw new Error('User data not found');
            }

            const userLevel = userGuildData.level || 1;
            const userXP = userGuildData.xp || 0;
            const userCoins = userGuildData.coins || 0;
            const requiredXP = getRequiredXP(userLevel);
            const rank = getRank(userId, guildId);

            // Ambil preferensi kustomisasi dari serverList
            const rankCardConfig = serverList[guildId]?.rankCard || {
                font: 'Default',
                mainColor: '#FFFFFF',
                backgroundColor: '#000000',
                overlayOpacity: 0.5,
                backgroundImage: ''
            };

            // Buat canvas
            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');

            // Load background
            let background;
            try {
                const backgroundUrl = rankCardConfig.backgroundImage || config.rankCardImage || 'https://s6.gifyu.com/images/bbXYO.gif';
                background = await loadImage(backgroundUrl);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            } catch (error) {
                console.warn(`[RankCommand] Failed to load background image: ${error.message}`);
                ctx.fillStyle = rankCardConfig.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Tambah overlay dengan opacity
            ctx.fillStyle = `rgba(0, 0, 0, ${rankCardConfig.overlayOpacity})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Load avatar user
            const avatarUrl = targetUser.displayAvatarURL({ extension: 'png', size: 128 });
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

            // Tambah teks
            ctx.font = 'bold 36px Sans'; // Font bisa dikustomisasi di masa depan
            ctx.fillStyle = rankCardConfig.mainColor;
            ctx.textAlign = 'left';
            ctx.fillText(`${targetUser.username}#${targetUser.discriminator}`, 200, 60);

            // Tambah teks rank, level, dan coins
            ctx.font = '24px Sans';
            ctx.fillText(`Rank #${rank}`, 200, 100);
            ctx.fillText(`Level ${userLevel}`, 400, 100);
            ctx.fillText(`Coins: ${userCoins}`, 200, 140);

            // Tambah progress bar XP
            const barWidth = 300;
            const barHeight = 20;
            const barX = 200;
            const barY = 170;
            const xpProgress = Math.min(userXP / requiredXP, 1);
            ctx.fillStyle = rankCardConfig.mainColor;
            ctx.fillRect(barX, barY, xpProgress * barWidth, barHeight);
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            // Tambah teks XP di bawah progress bar
            ctx.font = '16px Sans';
            ctx.fillText(`${userXP}/${requiredXP} XP`, 200, barY + 40);

            // Convert canvas ke buffer
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'rank-image.png' });

            // Kirim rank card
            await interaction.editReply({ files: [attachment] });
            console.log(`[RankCommand] Rank card sent for user ${userId} in guild ${guildId}`);
        } catch (error) {
            const userId = interaction.user.id; // Pastikan userId didefinisikan di sini jika error terjadi
            console.error(`[RankCommand] Error in rank command for user ${userId}: ${error.message}`);
            try {
                await interaction.editReply({ content: 'There was an error while fetching your rank.', ephemeral: true });
            } catch (replyError) {
                console.error(`[RankCommand] Failed to send error reply: ${replyError.message}`);
            }
        }
    },
};