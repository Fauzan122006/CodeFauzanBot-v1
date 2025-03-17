const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { config, saveConfig } = require('../utils/saveData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-level')
        .setDescription('Set the channel for level-up notifications')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send level-up notifications')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Defer reply untuk proses yang mungkin lama
        await interaction.deferReply();

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;

        if (!config[guildId]) config[guildId] = {};
        config[guildId].levelChannel = channel.id;
        saveConfig();

        // Gunakan editReply karena sudah defer
        await interaction.editReply(`Level-up channel set to ${channel}!`);
    },
};