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
        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;

        if (!config[guildId]) config[guildId] = {};
        config[guildId].achievementChannel = channel.id;
        saveConfig();

        await interaction.reply(`Achievement channel set to ${channel}!`);
    },
};