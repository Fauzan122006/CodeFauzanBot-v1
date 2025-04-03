const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { roleList, saveRoleList } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-role')
        .setDescription('Remove a role from the server role list.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name of the role to remove')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guildId;
        const name = interaction.options.getString('name');

        if (!roleList.guilds[guildId]) {
            await interaction.editReply({ content: 'No roles found for this server!' });
            return;
        }

        const index = roleList.guilds[guildId].findIndex(role => role.name === name);
        if (index === -1) {
            await interaction.editReply({ content: `Role "${name}" not found!` });
            return;
        }

        roleList.guilds[guildId].splice(index, 1);
        saveRoleList();

        await interaction.editReply(`Role "${name}" removed from the server role list!`);
    },
};