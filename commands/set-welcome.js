const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { config, saveConfig } = require('../utils/saveData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-welcome')
        .setDescription('Set the welcome channel for new members')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send welcome messages')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;

        if (!config[guildId]) config[guildId] = {};
        config[guildId].welcomeChannel = channel.id;
        saveConfig();

        await interaction.reply(`Welcome channel set to ${channel}!`);
    },
};