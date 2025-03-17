const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { config, saveConfig } = require('../utils/saveData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-achievement')
        .setDescription('Set the channel for achievement notifications')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send achievement notifications')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Defer reply untuk proses yang mungkin lama
        await interaction.deferReply();

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;

        if (!config[guildId]) config[guildId] = {};
        config[guildId].achievementChannel = channel.id;
        saveConfig();

        // Gunakan editReply karena sudah defer
        await interaction.editReply(`Achievement channel set to ${channel}!`);
    },
};