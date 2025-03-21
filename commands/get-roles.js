const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const { config, roleList } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('get-roles')
        .setDescription('Send the roles embed to the specified channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guildId;
        const serverConfig = config[guildId] || {};
        const rolesChannelId = serverConfig.rolesChannel || config.defaultChannels.rolesChannel || interaction.guild.channels.cache.find(ch => ch.name === 'get-role')?.id;
        const rolesChannel = interaction.guild.channels.cache.get(rolesChannelId);

        if (!rolesChannel) {
            await interaction.editReply({ content: 'Roles channel not set! Please set it using /set-roles.' });
            return;
        }

        if (!rolesChannel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
            await interaction.editReply({ content: 'Bot doesn\'t have permission to send messages in the roles channel!' });
            return;
        }

        if (!roleList || roleList.length === 0) {
            await interaction.editReply({ content: 'No roles found! Please check botconfig/roleList.json.' });
            return;
        }

        // Kelompokkan roles berdasarkan kategori
        const rolesByCategory = {};
        roleList.forEach(role => {
            if (!rolesByCategory[role.category]) {
                rolesByCategory[role.category] = [];
            }
            rolesByCategory[role.category].push(role);
        });

        // Buat embed dan select menu untuk setiap kategori
        const messages = [];
        for (const [category, roles] of Object.entries(rolesByCategory)) {
            const rolesText = roles.map(role => `${role.emoji} ${role.name}`).join('\n');
            const embed = new EmbedBuilder()
                .setTitle(category)
                .setDescription(`Silahkan pilih roles sesuai dengan keinginan kamu untuk mengakses channel yang tersedia dibawah sini!\n\n${rolesText}`)
                .setColor(config.colorthemecode || '#00BFFF')
                .setImage(config.categoryImages[category] || config.rolesImage || '');

            // Buat select menu untuk kategori ini
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`select-role-${category.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`)
                .setPlaceholder(`Pilih roles dari ${category}...`)
                .addOptions(
                    roles.map(role => ({
                        label: role.name,
                        value: role.name,
                        emoji: role.emoji
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Kirim embed dan select menu
            const message = await rolesChannel.send({ embeds: [embed], components: [row] });
            messages.push(message);
        }

        await interaction.editReply({ content: `Roles embed sent to ${rolesChannel}!` });
    },
};