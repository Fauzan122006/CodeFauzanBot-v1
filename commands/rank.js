const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { userData, initUser } = require('../utils/userDataHandler');
const { getRequiredXP } = require('../utils/levelUpHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your rank or someone else\'s rank.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the rank for.')
                .setRequired(false)),
    async execute(interaction, client) {
        try {
            await interaction.deferReply();

            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userId = targetUser.id;

            initUser(userId);

            // Pastikan data diambil dengan benar
            const userLevel = userData[userId]?.level || 1;
            const userXP = userData[userId]?.xp || 0;
            const requiredXP = getRequiredXP(userLevel);
            const rank = getRank(userId); // Pakai getRank berdasarkan XP

            console.log(`[RankCommand] User ${userId} - Level: ${userLevel}, XP: ${userXP}, Required XP: ${requiredXP}, Rank: ${rank}`);

            const canvas = createCanvas(500, 180);
            const ctx = canvas.getContext('2d');

            const background = await loadImage('https://s6.gifyu.com/images/bbXYO.gif');
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const avatar = await loadImage(targetUser.displayAvatarURL({ extension: 'png', size: 128 }));
            const avatarSize = 96;
            const avatarX = 40;
            const avatarY = (canvas.height - avatarSize) / 2;
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.stroke();

            ctx.font = 'bold 28px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(`${targetUser.username}'s Rank`, 150, canvas.height / 2 - 30);

            ctx.font = '18px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`Level ${userLevel}`, 150, canvas.height / 2 + 10);
            ctx.fillText(`Rank #${rank}`, 150, canvas.height / 2 + 40);

            const barWidth = 200;
            const barHeight = 15;
            const barX = 150;
            const barY = canvas.height / 2 + 60;
            const xpProgress = Math.min(userXP / requiredXP, 1);
            ctx.fillStyle = '#00BFFF';
            ctx.fillRect(barX, barY, xpProgress * barWidth, barHeight);
            ctx.strokeStyle = '#FFFFFF';
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            ctx.font = '10px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'right';
            ctx.fillText(`${userXP}/${requiredXP} XP`, barX + barWidth + 10, barY + 12);

            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'rank-image.png' });

            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error('[RankCommand] Error in rank command:', error);
            await interaction.editReply({ content: 'There was an error while fetching your rank.', ephemeral: true });
        }
    },
};