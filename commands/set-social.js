const { SlashCommandBuilder } = require('discord.js');
const { config, saveConfig } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-social')
        .setDescription('Set the channel for social media notifications.')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel for social media posts')
                .setRequired(true))
        .setDefaultMemberPermissions(8), // Hanya admin (PermissionFlagsBits.Administrator)
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guild.id;

        if (!config[guildId]) config[guildId] = {};
        config[guildId].socialChannel = channel.id;
        saveConfig();

        await interaction.editReply({ content: `Social media channel set to ${channel}! Notifications will be posted here.` });
    },
};