const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { config } = require('../utils/dataManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Beri peringatan kepada pengguna.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Pengguna yang akan diberi peringatan.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Alasan peringatan.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason');

        if (!targetUser) {
            await interaction.editReply({ content: 'Pengguna tidak ditemukan! Pastikan pengguna yang dipilih valid.' });
            return;
        }

        let member;
        try {
            member = await interaction.guild.members.fetch(targetUser.id);
        } catch (error) {
            await interaction.editReply({ content: 'Pengguna tidak ditemukan di server ini!' });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Kamu Mendapat Peringatan')
            .setDescription(`**Alasan:** ${reason}\n**Diberikan oleh:** ${interaction.user}`)
            .setColor(config.colorthemecode || '#FF0000')
            .setTimestamp();

        await member.send({ embeds: [embed] }).catch(() => {
            interaction.followUp({ content: 'Tidak dapat mengirim DM ke pengguna.', ephemeral: true });
        });

        await interaction.editReply({ content: `${targetUser} telah diberi peringatan dengan alasan: ${reason}` });
    },
};