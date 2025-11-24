const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Tampilkan informasi server'),
    
    async execute(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;

        // Fetch untuk mendapatkan data lengkap
        await guild.members.fetch();
        await guild.channels.fetch();

        const owner = await guild.fetchOwner();
        const createdAt = Math.floor(guild.createdTimestamp / 1000);

        // Hitung member stats
        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(m => !m.user.bot).size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const onlineMembers = guild.members.cache.filter(m => 
            m.presence?.status === 'online' || 
            m.presence?.status === 'idle' || 
            m.presence?.status === 'dnd'
        ).size;

        // Hitung channel stats
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categories = guild.channels.cache.filter(c => c.type === 4).size;

        // Role count
        const roleCount = guild.roles.cache.size;

        // Emoji count
        const emojiCount = guild.emojis.cache.size;
        const animatedEmojis = guild.emojis.cache.filter(e => e.animated).size;
        const staticEmojis = emojiCount - animatedEmojis;

        // Boost info
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`📊 ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
                { 
                    name: '👑 Owner', 
                    value: owner.user.tag, 
                    inline: true 
                },
                { 
                    name: '📅 Created', 
                    value: `<t:${createdAt}:R>`, 
                    inline: true 
                },
                { 
                    name: '🆔 Server ID', 
                    value: guild.id, 
                    inline: true 
                },
                { 
                    name: `👥 Members (${totalMembers})`, 
                    value: `👤 Humans: ${humans}\n🤖 Bots: ${bots}\n🟢 Online: ${onlineMembers}`, 
                    inline: true 
                },
                { 
                    name: `💬 Channels (${textChannels + voiceChannels})`, 
                    value: `📝 Text: ${textChannels}\n🔊 Voice: ${voiceChannels}\n📁 Categories: ${categories}`, 
                    inline: true 
                },
                { 
                    name: '🎭 Roles', 
                    value: `${roleCount}`, 
                    inline: true 
                },
                { 
                    name: `😀 Emojis (${emojiCount})`, 
                    value: `Static: ${staticEmojis}\nAnimated: ${animatedEmojis}`, 
                    inline: true 
                },
                { 
                    name: '💎 Boosts', 
                    value: `Level: ${boostLevel}\nBoosts: ${boostCount}`, 
                    inline: true 
                },
                { 
                    name: '🔒 Verification Level', 
                    value: `${guild.verificationLevel}`, 
                    inline: true 
                }
            )
            .setFooter({ text: `Requested by ${interaction.user.username}` })
            .setTimestamp();

        if (guild.description) {
            embed.setDescription(guild.description);
        }

        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
