const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Tampilkan informasi user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang ingin dilihat infonya')
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        let member;
        try {
            member = await interaction.guild.members.fetch(targetUser.id);
        } catch (error) {
            await interaction.editReply({ content: '❌ User tidak ada di server!' });
            return;
        }

        const createdAt = Math.floor(targetUser.createdTimestamp / 1000);
        const joinedAt = Math.floor(member.joinedTimestamp / 1000);

        // Get roles (exclude @everyone)
        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString())
            .slice(0, 10); // Max 10 roles

        const roleDisplay = roles.length > 0 
            ? roles.join(', ') + (member.roles.cache.size > 11 ? `... (+${member.roles.cache.size - 11} more)` : '')
            : 'None';

        // Status
        const status = member.presence?.status || 'offline';
        const statusEmoji = {
            'online': '🟢',
            'idle': '🟡',
            'dnd': '🔴',
            'offline': '⚫'
        };

        // Activities
        const activities = member.presence?.activities || [];
        const activityText = activities.length > 0
            ? activities.map(a => a.name).join(', ')
            : 'None';

        // Key permissions
        const keyPerms = [];
        if (member.permissions.has('Administrator')) keyPerms.push('👑 Administrator');
        if (member.permissions.has('ManageGuild')) keyPerms.push('⚙️ Manage Server');
        if (member.permissions.has('ManageRoles')) keyPerms.push('🎭 Manage Roles');
        if (member.permissions.has('ManageChannels')) keyPerms.push('📝 Manage Channels');
        if (member.permissions.has('KickMembers')) keyPerms.push('👢 Kick Members');
        if (member.permissions.has('BanMembers')) keyPerms.push('🔨 Ban Members');

        const embed = new EmbedBuilder()
            .setColor(member.displayHexColor || '#0099FF')
            .setTitle(`${statusEmoji[status]} ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .addFields(
                { 
                    name: '🆔 User ID', 
                    value: targetUser.id, 
                    inline: true 
                },
                { 
                    name: '📅 Account Created', 
                    value: `<t:${createdAt}:R>`, 
                    inline: true 
                },
                { 
                    name: '📥 Joined Server', 
                    value: `<t:${joinedAt}:R>`, 
                    inline: true 
                },
                { 
                    name: '🎮 Status', 
                    value: status.charAt(0).toUpperCase() + status.slice(1), 
                    inline: true 
                },
                { 
                    name: '🎯 Activity', 
                    value: activityText, 
                    inline: true 
                },
                { 
                    name: `🎭 Roles [${member.roles.cache.size - 1}]`, 
                    value: roleDisplay, 
                    inline: false 
                }
            )
            .setFooter({ text: `Requested by ${interaction.user.username}` })
            .setTimestamp();

        if (keyPerms.length > 0) {
            embed.addFields({
                name: '🔑 Key Permissions',
                value: keyPerms.join('\n'),
                inline: false
            });
        }

        // Add nickname if exists
        if (member.nickname) {
            embed.addFields({
                name: '📛 Nickname',
                value: member.nickname,
                inline: true
            });
        }

        // Add boosting info if member is boosting
        if (member.premiumSince) {
            const boostingSince = Math.floor(member.premiumSinceTimestamp / 1000);
            embed.addFields({
                name: '💎 Boosting Since',
                value: `<t:${boostingSince}:R>`,
                inline: true
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
