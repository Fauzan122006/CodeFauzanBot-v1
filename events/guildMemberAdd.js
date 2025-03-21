const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { config } = require('../utils/dataManager');
const { userData } = require('../utils/functions');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');

const achievementFile = fs.readFileSync('./botconfig/achievementList.json', 'utf8');
const achievements = JSON.parse(achievementFile);

const log = (module, message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${module}] ${message}`);
};

function getAchievementImagePath(key) {
    const imagePath = achievements[key]?.icon;
    if (imagePath && fs.existsSync(imagePath)) {
        return imagePath;
    }
    log('GuildMemberAdd', `Image not found for ${key} at ${imagePath}, using default.`);
    return 'https://i.imgur.com/default-icon.png'; // Fallback URL
}

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            log('GuildMemberAdd', `User ${member.user.tag} (${member.user.id}) joined guild ${member.guild.id}`);

            const guildId = member.guild.id;
            const userId = member.user.id;
            const serverConfig = config[guildId] || {};
            const welcomeChannelId = serverConfig.welcomeChannel || config.defaultChannels.welcomeChannel || member.guild.channels.cache.find(ch => ch.name === 'welcome')?.id;
            let welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

            if (!welcomeChannel) {
                log('GuildMemberAdd', `Welcome channel not found for guild ${guildId}. Expected ID: ${welcomeChannelId}`);
                return;
            }

            // Coba fetch channel kalau gak ada di cache
            try {
                welcomeChannel = await member.guild.channels.fetch(welcomeChannelId);
            } catch (error) {
                log('GuildMemberAdd', `Failed to fetch welcome channel ${welcomeChannelId}: ${error.message}`);
                return;
            }

            if (!welcomeChannel) {
                log('GuildMemberAdd', `Welcome channel not found after fetch for guild ${guildId}. Expected ID: ${welcomeChannelId}`);
                return;
            }

            log('GuildMemberAdd', `Found welcome channel: ${welcomeChannel.name} (${welcomeChannelId})`);

            const botMember = member.guild.members.me;
            if (!welcomeChannel.permissionsFor(botMember)?.has(['SendMessages', 'ViewChannel'])) {
                log('GuildMemberAdd', `Bot lacks permissions (SendMessages, ViewChannel) for channel ${welcomeChannel.name} (${welcomeChannelId})`);
                return;
            }

            // Inisialisasi data user
            if (!userData[userId]) {
                userData[userId] = {
                    xp: 0,
                    level: 0,
                    messageCount: 0,
                    achievements: [],
                    activeTime: 0,
                    voiceTime: 0,
                    lastActive: Date.now(),
                    joinDate: Date.now(),
                    reactionCount: 0,
                    memeCount: 0,
                    supportMessages: 0,
                    gameTime: 0,
                    eventCount: 0,
                    isBooster: false
                };
                log('GuildMemberAdd', `Initialized user data for ${userId}`);
            }

            // Buat gambar welcome
            const canvas = createCanvas(700, 250);
            const ctx = canvas.getContext('2d');

            const backgroundUrl = config.welcomeImage || 'https://s6.gifyu.com/images/bbXYO.gif';
            log('GuildMemberAdd', `Loading welcome image from URL: ${backgroundUrl}`);
            let background;
            try {
                background = await loadImage(backgroundUrl);
            } catch (error) {
                log('GuildMemberAdd', `Failed to load welcome image: ${error.message}`);
                background = await loadImage('https://via.placeholder.com/700x250');
            }
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
            log('GuildMemberAdd', `Loading avatar from URL: ${avatarUrl}`);
            let avatar;
            try {
                avatar = await loadImage(avatarUrl);
            } catch (error) {
                log('GuildMemberAdd', `Failed to load avatar: ${error.message}`);
                avatar = await loadImage('https://via.placeholder.com/128');
            }

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

            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.stroke();

            ctx.font = 'bold 36px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'left';
            ctx.fillText(`Welcome ${member.user.username}!`, 200, canvas.height / 2 - 20);

            ctx.font = '24px Sans';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(`Member #${member.guild.memberCount}`, 200, canvas.height / 2 + 20);

            const buffer = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });

            log('GuildMemberAdd', `Sending welcome message to channel ${welcomeChannel.name} (${welcomeChannelId})`);
            await welcomeChannel.send({
                content: `Hey ${member.toString()}, selamat datang di **${member.guild.name}**!`,
                files: [attachment]
            });
            log('GuildMemberAdd', `Welcome message sent for user ${userId} in guild ${guildId}`);
        } catch (error) {
            log('GuildMemberAdd', `Error in guildMemberAdd event for user ${member.user.id}: ${error.message}`);
        }
    },
};