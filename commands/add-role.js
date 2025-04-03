const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { roleList, saveRoleList } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-role')
        .setDescription('Add a role to the server role list.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the role')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('The emoji for the role')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category for the role')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guildId;
        const name = interaction.options.getString('name');
        const emoji = interaction.options.getString('emoji');
        const category = interaction.options.getString('category');

        if (!roleList.guilds[guildId]) roleList.guilds[guildId] = [];
        roleList.guilds[guildId].push({ name, emoji, category });
        saveRoleList();

        await interaction.editReply(`Role "${name}" added to category "${category}" with emoji ${emoji}!`);
    },
};