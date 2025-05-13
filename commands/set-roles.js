const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const { serverList, saveServerList } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-roles')
        .setDescription('Set the roles message for the server.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send the roles message.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply();

        const channel = interaction.options.getChannel('channel');
        if (!channel.isTextBased() || channel.isThread()) {
            return interaction.editReply({ content: 'Please select a text channel!' });
        }

        if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
            return interaction.editReply({ content: 'I don\'t have permission to send messages or view that channel!' });
        }

        const guildId = interaction.guild.id;
        if (!serverList[guildId]) serverList[guildId] = {};
        serverList[guildId].roles = {
            enabled: true,
            channel: channel.id,
            categories: serverList[guildId].roles?.categories || []
        };
        saveServerList();

        const categories = serverList[guildId].roles.categories || [];
        if (categories.length === 0) {
            return interaction.editReply({ content: 'No role categories defined. Please set up categories in the dashboard.' });
        }

        for (const category of categories) {
            const embed = new EmbedBuilder()
                .setTitle(category.name)
                .setColor('#00BFFF');

            if (category.image) {
                embed.setImage(category.image);
            }

            const options = category.roles.map(roleName => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(roleName)
                    .setValue(roleName)
            );

            if (options.length === 0) continue;

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`select-role-${category.name}`)
                .setPlaceholder(`Select a role from ${category.name}`)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await channel.send({ embeds: [embed], components: [row] });
        }

        await interaction.editReply({ content: `Roles message set in ${channel}!` });
    },
};