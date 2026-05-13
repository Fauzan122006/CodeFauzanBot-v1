const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { bulkAddRoleToMembers } = require('../utils/bulkRoleManager');

function buildSummaryMessage(result, roleToAdd, sourceRole, includeBots) {
    if (!result.ok) {
        return `❌ ${result.error}`;
    }

    const scope = sourceRole ? `member dengan role **${sourceRole.name}**` : 'semua member';
    const lines = [
        '✅ Bulk add role selesai.',
        `Role tujuan: **${roleToAdd.name}**`,
        `Target: **${scope}** ${includeBots ? '(termasuk bot)' : '(tanpa bot)'}`,
        `Berhasil ditambahkan: **${result.added}**`,
        `Sudah punya role: **${result.alreadyHasRole}**`,
        `Tidak sesuai filter: **${result.filteredOut}**`,
        `Tidak bisa dikelola bot: **${result.unmanageable}**`,
        `Gagal: **${result.failed}**`
    ];

    if (result.failureSamples.length > 0) {
        lines.push('', `Contoh gagal:\n- ${result.failureSamples.join('\n- ')}`);
    }

    return lines.join('\n');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bulk-add-role')
        .setDescription('Tambahkan role secara massal ke semua member atau member dengan role tertentu.')
        .addRoleOption(option =>
            option.setName('role_tujuan')
                .setDescription('Role yang akan ditambahkan ke member.')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('hanya_member_dengan_role')
                .setDescription('Opsional: hanya member dengan role ini yang akan diproses.')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('termasuk_bot')
                .setDescription('Opsional: sertakan akun bot dalam proses.')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const roleToAdd = interaction.options.getRole('role_tujuan');
        const sourceRole = interaction.options.getRole('hanya_member_dengan_role');
        const includeBots = interaction.options.getBoolean('termasuk_bot') ?? false;

        if (!roleToAdd) {
            await interaction.editReply({ content: '❌ Role tujuan tidak ditemukan.' });
            return;
        }

        const result = await bulkAddRoleToMembers({
            guild: interaction.guild,
            roleToAdd,
            sourceRole,
            includeBots,
            reason: `Bulk add role via slash command by ${interaction.user.tag}`
        });

        await interaction.editReply({
            content: buildSummaryMessage(result, roleToAdd, sourceRole, includeBots)
        });
    }
};
