const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { config } = require('../utils/saveData');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            const guildId = member.guild.id;
            const serverConfig = config[guildId] || {};
            const welcomeChannelId = serverConfig.welcomeChannel || config.defaultChannels.welcomeChannel || member.guild.channels.cache.find(ch => ch.name === 'welcome')?.id;
            const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

            if (!welcomeChannel) {
                console.log(`Welcome channel not found for guild ${guildId}`);
                return;
            }

            // Ambil nama bot dari config
            const botName = config.clientname || 'CodeFauzan';
            const currentDate = new Date().toLocaleDateString('en-GB'); // Format: DD/MM/YYYY
            const memberCount = member.guild.memberCount;

            // Teks selamat datang sebelum gambar
            const welcomeText = `${botName} @APP ${currentDate} welcome @${member.user.username} in ${member.guild.name}, with this we have ${memberCount} members`;

            // Buat canvas untuk gambar welcome
            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');

            // Load background gambar
            const backgroundUrl = config.welcomeImage || 'https://s6.gifyu.com/images/bbXYO.gif';
            const background = await loadImage(backgroundUrl);
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // Tambah efek gelap (overlay) di background biar teks lebih readable
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Load profile picture user
            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
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

            // Tambah border lingkaran di profile picture
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.stroke();

            // Tambah teks selamat datang di gambar
            ctx.font = 'bold 36px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(`Welcome ${member.user.username}!`, 200, canvas.height / 2 - 20);

            // Tambah teks member count di gambar
            ctx.font = '24px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`Member #${memberCount}`, 200, canvas.height / 2 + 20);

            // Convert canvas ke buffer dan buat attachment
            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });

            // Kirim teks dan gambar ke channel welcome
            await welcomeChannel.send(welcomeText);
            await welcomeChannel.send({ files: [attachment] });

        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};