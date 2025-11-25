const { Events, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { serverList } = require('../utils/dataManager');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Track recent welcomes to prevent duplicates
const recentWelcomes = new Map();
const WELCOME_COOLDOWN = 5000; // 5 seconds cooldown

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const guildId = member.guild.id;
        const userId = member.user.id;
        const welcomeKey = `${guildId}-${userId}`;
        
        // Check if we just sent a welcome for this user
        const lastWelcome = recentWelcomes.get(welcomeKey);
        if (lastWelcome && Date.now() - lastWelcome < WELCOME_COOLDOWN) {
            console.log(`[GuildMemberAdd] Skipping duplicate welcome for ${member.user.tag} (cooldown: ${Date.now() - lastWelcome}ms)`);
            return;
        }
        
        const config = serverList[guildId]?.welcome;

        console.log(`[GuildMemberAdd] Member joined: ${member.user.tag} in guild ${guildId}`);
        console.log(`[GuildMemberAdd] Welcome config: ${JSON.stringify(config)}`);

        if (!config || !config.enabled) {
            console.log(`[GuildMemberAdd] Welcome message disabled or config not found for guild ${guildId}`);
            return;
        }

        const channel = member.guild.channels.cache.get(config.channel);
        if (!channel) {
            console.warn(`[GuildMemberAdd] Welcome channel not found for guild ${guildId}: ${config.channel}`);
            return;
        }

        // Periksa izin bot untuk mengirim pesan
        const botMember = member.guild.members.me;
        if (!botMember.permissionsIn(channel).has(['SendMessages', 'AttachFiles'])) {
            console.warn(`[GuildMemberAdd] Bot lacks permissions to send messages in channel ${channel.id} for guild ${guildId}`);
            return;
        }

        // Mark this welcome as sent
        recentWelcomes.set(welcomeKey, Date.now());
        
        // Clean up old entries (older than 1 minute)
        setTimeout(() => {
            recentWelcomes.delete(welcomeKey);
        }, 60000);

        // ... (bagian sebelumnya seperti pembuatan canvas tetap sama)

try {
    // Buat canvas untuk pesan selamat datang dengan gambar
    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    // Load background
    let background;
    try {
        const backgroundUrl = config.backgroundImage || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c';
        console.log(`[GuildMemberAdd] Loading background from: ${backgroundUrl}`);
        background = await loadImage(backgroundUrl);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (error) {
        console.warn(`[GuildMemberAdd] Failed to load background image: ${error.message}`);
        ctx.fillStyle = config.backgroundColor || '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Tambah overlay dengan opacity
    ctx.fillStyle = `rgba(0, 0, 0, ${config.overlayOpacity || 0.5})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load avatar user
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128 });
    console.log(`[GuildMemberAdd] Loading avatar from: ${avatarUrl}`);
    const avatar = await loadImage(avatarUrl);

    // Gambar avatar dalam lingkaran
    const avatarSize = 128;
    const avatarX = (canvas.width - avatarSize) / 2;
    const avatarY = 20;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Tambah border lingkaran dengan efek neon
    ctx.strokeStyle = config.welcomeNeonColor || '#ff8c00';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.stroke();

    // Tambah teks title
    ctx.font = `bold 36px ${config.font === 'Default' ? 'Sans' : config.font}`;
    ctx.fillStyle = config.welcomeTextColor || '#ffffff';
    ctx.textAlign = 'center';
    const titleText = (config.title || 'Welcome to {server}').replace('{server}', member.guild.name);
    ctx.fillText(titleText, canvas.width / 2, 180);

    // Tambah teks subtitle
    ctx.font = `24px ${config.font === 'Default' ? 'Sans' : config.font}`;
    ctx.fillStyle = config.memberTextColor || '#ff8c00';
    const rulesChannel = member.guild.channels.cache.find(ch => ch.name.includes('rules'))?.id || '78978103164978979'; // Ganti dengan ID channel #rules
    const subtitleText = (config.subtitle || 'You are member #{server_member_count}. Make sure to read #rules!')
        .replace('{server_member_count}', member.guild.memberCount)
        .replace(/#rules/i, `<#${rulesChannel}>`);
    ctx.fillText(subtitleText.toUpperCase(), canvas.width / 2, 220);

    // Convert canvas ke buffer
    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });

    // Kirim pesan selamat datang berdasarkan messageType
    if (config.messageType === 'embed') {
        const embed = new EmbedBuilder()
            .setTitle(titleText)
            .setDescription(
                (config.welcomeText || 'Hey {user}, selamat datang di {server}!')
                    .replace('{user}', member.user.toString())
                    .replace('{server}', member.guild.name)
            )
            .setColor(config.embedColor || '#5865f2')
            .setImage('attachment://welcome-image.png')
            .setTimestamp();

        console.log(`[GuildMemberAdd] Sending EMBED welcome for ${member.user.tag} with key ${welcomeKey}`);
        await channel.send({ embeds: [embed], files: [attachment] });
        console.log(`[GuildMemberAdd] ✅ Sent embed welcome message with image for ${member.user.tag} in guild ${guildId}`);
    } else {
        console.log(`[GuildMemberAdd] Sending TEXT welcome for ${member.user.tag} with key ${welcomeKey}`);
        await channel.send({
            content: (config.welcomeText || 'Hey {user}, selamat datang di {server}!')
                .replace('{user}', member.user.toString())
                .replace('{server}', member.guild.name),
            files: [attachment]
        });
        console.log(`[GuildMemberAdd] ✅ Sent text welcome message with image for ${member.user.tag} in guild ${guildId}`);
    }
} catch (error) {
    console.error(`[GuildMemberAdd] Error sending welcome message for ${member.user.tag} in guild ${guildId}: ${error.message}`);
}
    },
};