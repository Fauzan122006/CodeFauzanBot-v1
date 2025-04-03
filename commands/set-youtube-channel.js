const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { config, saveConfig } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-youtube-channel')
        .setDescription('Set the YouTube channel ID for notifications.')
        .addStringOption(option =>
            option.setName('channel-id')
                .setDescription('The YouTube channel ID to monitor.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channelId = interaction.options.getString('channel-id');
        const guildId = interaction.guild.id;

        if (!config[guildId]) config[guildId] = {};
        config[guildId].youtubeChannelId = channelId;
        saveConfig();

        await interaction.editReply(`YouTube channel ID set to ${channelId} for this server!`);
    },
};