const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { config, saveConfig } = require('../utils/saveData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-roles')
        .setDescription('Set the channel for roles embed')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send roles embed')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');
        const guildId = interaction.guildId;

        if (!channel.permissionsFor(interaction.guild.members.me).has(['SendMessages', 'ViewChannel'])) {
            return interaction.editReply({ content: 'Bot doesn\'t have permission to send messages in that channel!' });
        }

        if (!config[guildId]) config[guildId] = {};
        config[guildId].rolesChannel = channel.id;
        saveConfig();

        await interaction.editReply(`Roles channel set to ${channel}!`);
    },
};